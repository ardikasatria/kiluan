"""Naik Kelas Lestari (KONTRAK §6.3/§7): pengajuan kartu → validasi → sertifikasi owner."""
from __future__ import annotations

from uuid import UUID

from .. import enums, mesin_status
from ..errors import TidakBerwenang, TidakDitemukan, ValidasiGagal
from ..ids import sekarang
from ..konteks import Aktor, wajib_pengelola
from ..models import KurasiLog, PengajuanKartu, SertifikasiOwner
from ..repositori import RepoMemori

# ambang tingkat (konfigurable) — skor = Σ bobot kartu tervalidasi
AMBANG = [("lumba_lumba", 50), ("bahari", 30), ("tunas", 10)]


def tingkat_dari_skor(skor: int) -> str | None:
    for nama, batas in AMBANG:
        if skor >= batas:
            return nama
    return None


class SertifikasiService:
    def __init__(self, repo: RepoMemori, repo_pengajuan: RepoMemori, repo_kartu: RepoMemori):
        self.repo = repo
        self.pengajuan = repo_pengajuan
        self.kartu = repo_kartu

    async def hitung_ulang(self, desa_id: UUID, subjek_tipe: str, subjek_id: UUID) -> SertifikasiOwner | None:
        kartu_map = {k.id: k for k in await self.kartu.semua()}
        tervalidasi = [
            p for p in await self.pengajuan.cari(
                desa_id=desa_id, subjek_tipe=subjek_tipe, subjek_id=subjek_id, status="tervalidasi")
        ]
        # satu kartu dihitung sekali walau diajukan berulang
        kartu_unik = {p.kartu_id for p in tervalidasi}
        skor = sum(kartu_map[kid].bobot for kid in kartu_unik if kid in kartu_map)
        tingkat = tingkat_dari_skor(skor)
        if tingkat is None:
            return None
        ada = await self.repo.cari(desa_id=desa_id, subjek_tipe=subjek_tipe, subjek_id=subjek_id)
        if ada:
            s = ada[0]
            s.skor, s.tingkat, s.diperbarui_pada = skor, tingkat, sekarang()
        else:
            s = SertifikasiOwner(desa_id=desa_id, subjek_tipe=subjek_tipe,
                                 subjek_id=subjek_id, tingkat=tingkat, skor=skor)
        return await self.repo.simpan(s)

    async def ambil(self, desa_id: UUID, subjek_tipe: str, subjek_id: UUID) -> SertifikasiOwner | None:
        ada = await self.repo.cari(desa_id=desa_id, subjek_tipe=subjek_tipe, subjek_id=subjek_id)
        return ada[0] if ada else None


class PengajuanKartuService:
    def __init__(self, repo: RepoMemori, repo_kartu: RepoMemori,
                 repo_log: RepoMemori, sertifikasi: SertifikasiService,
                 repo_umkm: RepoMemori):
        self.repo = repo
        self.kartu = repo_kartu
        self.log = repo_log
        self.sertifikasi = sertifikasi
        self.umkm = repo_umkm

    async def _cek_pemilik_subjek(self, aktor: Aktor, desa_id: UUID, subjek_tipe: str, subjek_id: UUID):
        if aktor.pengelola(desa_id):
            return
        if subjek_tipe == "umkm":
            umkm = await self.umkm.ambil(subjek_id)
            if umkm is None or umkm.desa_id != desa_id or umkm.dihapus_pada is not None:
                raise TidakDitemukan("UMKM subjek tak ditemukan.")
            if umkm.pengguna_id != aktor.pengguna_id:
                raise TidakBerwenang("Hanya pemilik subjek boleh mengajukan.")
        else:  # agen / pokdarwis → subjek_id = pengguna.id
            if subjek_id != aktor.pengguna_id:
                raise TidakBerwenang("Hanya pemilik subjek boleh mengajukan.")

    def _validasi_bukti(self, kartu, bukti: dict):
        butuh = kartu.bukti_dibutuhkan or {}
        if butuh.get("foto") and not bukti.get("foto_media_id"):
            raise ValidasiGagal("Bukti foto wajib.", rincian=[{"field": "bukti", "pesan": "foto_wajib"}])
        if butuh.get("dokumen") and not bukti.get("dokumen_media_id"):
            raise ValidasiGagal("Bukti dokumen wajib.", rincian=[{"field": "bukti", "pesan": "dokumen_wajib"}])
        if butuh.get("pernyataan") and not bukti.get("pernyataan"):
            raise ValidasiGagal("Pernyataan wajib.", rincian=[{"field": "bukti", "pesan": "pernyataan_wajib"}])

    async def ajukan(self, aktor: Aktor, desa_id: UUID, data: dict) -> PengajuanKartu:
        subjek_tipe = enums.wajib_enum(data["subjek_tipe"], enums.PENGAJUAN_SUBJEK_TIPE, "subjek_tipe")
        subjek_id = data["subjek_id"]
        await self._cek_pemilik_subjek(aktor, desa_id, subjek_tipe, subjek_id)
        kartu = await self.kartu.ambil(data["kartu_id"])
        if kartu is None or kartu.desa_id not in (None, desa_id) or not kartu.aktif:
            raise TidakDitemukan("Kartu aksi tak ditemukan.")
        self._validasi_bukti(kartu, data.get("bukti", {}))
        p = PengajuanKartu(
            desa_id=desa_id, subjek_tipe=subjek_tipe, subjek_id=subjek_id,
            kartu_id=kartu.id, bukti=data.get("bukti", {}),
        )
        return await self.repo.simpan(p)

    async def _ambil(self, desa_id: UUID, id_: UUID) -> PengajuanKartu:
        p = await self.repo.ambil(id_)
        if p is None or p.desa_id != desa_id:
            raise TidakDitemukan("Pengajuan tak ditemukan.")
        return p

    async def transisi(self, aktor: Aktor, desa_id: UUID, id_: UUID,
                       aksi: str, catatan: str = "") -> PengajuanKartu:
        p = await self._ambil(desa_id, id_)
        if aksi in ("setuju", "tolak", "minta_revisi"):
            wajib_pengelola(aktor, desa_id)
        elif aksi == "ajukan":  # kirim ulang oleh owner
            await self._cek_pemilik_subjek(aktor, desa_id, p.subjek_tipe, p.subjek_id)
        dari = p.status
        ke = mesin_status.transisi("pengajuan_kartu", dari, aksi)
        p.status = ke
        if aksi in ("setuju", "tolak", "minta_revisi"):
            p.validator_id = aktor.pengguna_id
            p.catatan = catatan
        if ke == "tervalidasi":
            p.divalidasi_pada = sekarang()
        await self.repo.simpan(p)
        await self.log.simpan(KurasiLog(
            entitas_tipe="pengajuan_kartu", entitas_id=p.id, dari_status=dari, ke_status=ke,
            kurator_id=aktor.pengguna_id, keputusan=aksi, catatan=catatan,
        ))
        if ke == "tervalidasi":
            await self.sertifikasi.hitung_ulang(desa_id, p.subjek_tipe, p.subjek_id)
        return p

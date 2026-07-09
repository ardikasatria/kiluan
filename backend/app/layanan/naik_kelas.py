"""Naik Kelas Lestari (KONTRAK §7): pengajuan kartu → validasi → sertifikasi owner."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from app.domain import mesin_status
from app.domain import entitas as E
from app.domain.enums import KodePeran, StatusPengajuanKartu, SubjekPengajuan, TingkatSertifikasi
from app.domain.errors import KesalahanValidasi, Konflik, TidakBerwenang, TidakDitemukan, TidakTerautentikasi
from app.domain.konteks import Konteks
from app.domain.paginasi import keyset

# Ambang placeholder — input tata kelola Pokdarwis (ADR-08).
AMBANG = [(TingkatSertifikasi.lumba_lumba.value, 50), (TingkatSertifikasi.bahari.value, 30), (TingkatSertifikasi.tunas.value, 10)]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def tingkat_dari_skor(skor: int) -> str | None:
    for nama, batas in AMBANG:
        if skor >= batas:
            return nama
    return None


def _pengelola(konteks: Konteks, desa_id: UUID) -> bool:
    return konteks.admin_global() or bool(
        konteks.peran_di(desa_id) & {KodePeran.pokdarwis, KodePeran.perangkat_desa, KodePeran.admin}
    )


def _wajib_pengelola(konteks: Konteks, desa_id: UUID) -> None:
    if not _pengelola(konteks, desa_id):
        raise TidakBerwenang("Hanya pengelola desa.")


def _wajib_login(konteks: Konteks, desa_id: UUID) -> None:
    if konteks.anonim:
        raise TidakTerautentikasi("perlu masuk terlebih dahulu")
    if konteks.admin_global():
        return
    if not konteks.peran_di(desa_id):
        raise TidakBerwenang("Perlu keanggotaan aktif di desa ini.")


def _enum_nilai(enum_cls, nilai: str, field: str) -> str:
    try:
        return enum_cls(nilai).value
    except ValueError:
        raise KesalahanValidasi(
            f"Nilai {field} tidak valid.",
            rincian=[{"field": field, "pesan": "enum_tidak_valid"}],
        )


class NaikKelasLayanan:
    def __init__(self, store):
        self.store = store

    async def daftar_kartu(self, desa_id: UUID) -> list[dict]:
        rows = await self.store.kartu_aksi.daftar_aktif(desa_id)
        return [self._dto_kartu(k) for k in rows]

    async def detail_kartu(self, desa_id: UUID, kartu_id: int) -> dict:
        k = await self.store.kartu_aksi.ambil(kartu_id)
        if k is None or not k.aktif or (k.desa_id not in (None, desa_id)):
            raise TidakDitemukan("Kartu aksi tak ditemukan.")
        return self._dto_kartu(k)

    async def _cek_pemilik_subjek(
        self, konteks: Konteks, desa_id: UUID, subjek_tipe: str, subjek_id: UUID,
    ) -> None:
        if _pengelola(konteks, desa_id):
            return
        if subjek_tipe == SubjekPengajuan.umkm.value:
            umkm = await self.store.umkm.ambil(subjek_id)
            if umkm is None or umkm.desa_id != desa_id or umkm.dihapus_pada is not None:
                raise TidakDitemukan("Resource tak ditemukan.")
            if umkm.pengguna_id != konteks.pengguna_id:
                raise TidakBerwenang("Hanya pemilik subjek boleh mengajukan.")
        elif subjek_id != konteks.pengguna_id:
            raise TidakBerwenang("Hanya pemilik subjek boleh mengajukan.")

    def _validasi_bukti(self, kartu: E.KartuAksi, bukti: dict) -> None:
        butuh = kartu.bukti_dibutuhkan or {}
        if butuh.get("foto") and not bukti.get("foto_media_id"):
            raise KesalahanValidasi(
                "Bukti foto wajib.",
                rincian=[{"field": "bukti", "pesan": "foto_wajib"}],
            )
        if butuh.get("dokumen") and not bukti.get("dokumen_media_id"):
            raise KesalahanValidasi(
                "Bukti dokumen wajib.",
                rincian=[{"field": "bukti", "pesan": "dokumen_wajib"}],
            )
        if butuh.get("pernyataan") and not bukti.get("pernyataan"):
            raise KesalahanValidasi(
                "Pernyataan wajib.",
                rincian=[{"field": "bukti", "pesan": "pernyataan_wajib"}],
            )

    async def _cek_pengajuan_ganda(
        self, desa_id: UUID, subjek_tipe: str, subjek_id: UUID, kartu_id: int,
    ) -> None:
        for p in await self.store.pengajuan_kartu.cari(
            desa_id=desa_id, subjek_tipe=subjek_tipe, subjek_id=subjek_id, kartu_id=kartu_id,
        ):
            if p.status in (
                StatusPengajuanKartu.menunggu.value,
                StatusPengajuanKartu.revisi.value,
                StatusPengajuanKartu.tervalidasi.value,
            ):
                raise Konflik(
                    "Pengajuan kartu ini sudah ada untuk subjek.",
                    [{"field": "kartu_id", "pesan": "pengajuan_ganda"}],
                )

    async def ajukan(self, konteks: Konteks, desa_id: UUID, data: dict) -> E.PengajuanKartu:
        _wajib_login(konteks, desa_id)
        subjek_tipe = _enum_nilai(SubjekPengajuan, data["subjek_tipe"], "subjek_tipe")
        subjek_id = data["subjek_id"]
        if isinstance(subjek_id, str):
            subjek_id = UUID(subjek_id)
        await self._cek_pemilik_subjek(konteks, desa_id, subjek_tipe, subjek_id)
        kartu = await self.store.kartu_aksi.ambil(data["kartu_id"])
        if kartu is None or kartu.desa_id not in (None, desa_id) or not kartu.aktif:
            raise TidakDitemukan("Kartu aksi tak ditemukan.")
        bukti = data.get("bukti", {})
        self._validasi_bukti(kartu, bukti)
        await self._cek_pengajuan_ganda(desa_id, subjek_tipe, subjek_id, kartu.id)
        p = E.PengajuanKartu(
            desa_id=desa_id,
            subjek_tipe=subjek_tipe,
            subjek_id=subjek_id,
            kartu_id=kartu.id,
            bukti=bukti,
        )
        return await self.store.pengajuan_kartu.simpan(p)

    async def daftar_pengajuan(
        self,
        konteks: Konteks,
        desa_id: UUID,
        *,
        status: str | None = None,
        subjek_tipe: str | None = None,
        subjek_id: UUID | None = None,
        milik_saya: bool = False,
        kursor: str | None = None,
        batas: int = 20,
    ) -> dict:
        _wajib_login(konteks, desa_id)
        if milik_saya:
            assert konteks.pengguna_id is not None
            rows = await self.store.pengajuan_kartu.daftar(desa_id)
            rows = [
                p for p in rows
                if await self._milik_pengajuan(konteks, desa_id, p)
            ]
        else:
            _wajib_pengelola(konteks, desa_id)
            rows = await self.store.pengajuan_kartu.daftar(desa_id)
            if status:
                rows = [p for p in rows if p.status == status]
            else:
                rows = [p for p in rows if p.status == StatusPengajuanKartu.menunggu.value]
        if subjek_tipe:
            rows = [p for p in rows if p.subjek_tipe == subjek_tipe]
        if subjek_id:
            rows = [p for p in rows if p.subjek_id == subjek_id]
        rows = sorted(rows, key=lambda p: p.urut, reverse=True)
        hal = keyset(rows, batas=batas, kursor=kursor)
        return {
            "item": [await self._dto_pengajuan(p) for p in hal.item],
            "meta": hal.meta(),
        }

    async def _milik_pengajuan(self, konteks: Konteks, desa_id: UUID, p: E.PengajuanKartu) -> bool:
        try:
            await self._cek_pemilik_subjek(konteks, desa_id, p.subjek_tipe, p.subjek_id)
            return True
        except (TidakBerwenang, TidakDitemukan):
            return False

    async def detail_pengajuan(self, konteks: Konteks, desa_id: UUID, id_: UUID) -> dict:
        _wajib_login(konteks, desa_id)
        p = await self._ambil_pengajuan(desa_id, id_)
        if not _pengelola(konteks, desa_id):
            await self._cek_pemilik_subjek(konteks, desa_id, p.subjek_tipe, p.subjek_id)
        return await self._dto_pengajuan(p)

    async def revisi_bukti(
        self, konteks: Konteks, desa_id: UUID, id_: UUID, bukti: dict,
    ) -> E.PengajuanKartu:
        _wajib_login(konteks, desa_id)
        p = await self._ambil_pengajuan(desa_id, id_)
        await self._cek_pemilik_subjek(konteks, desa_id, p.subjek_tipe, p.subjek_id)
        if p.status != StatusPengajuanKartu.revisi.value:
            raise KesalahanValidasi(
                "Hanya bisa direvisi saat status revisi.",
                rincian=[{"field": "status", "pesan": "bukan_revisi"}],
            )
        kartu = await self.store.kartu_aksi.ambil(p.kartu_id)
        if kartu is None:
            raise TidakDitemukan("Kartu aksi tak ditemukan.")
        self._validasi_bukti(kartu, bukti)
        p.bukti = bukti
        return await self.store.pengajuan_kartu.simpan(p)

    async def transisi(
        self, konteks: Konteks, desa_id: UUID, id_: UUID, aksi: str, catatan: str = "",
    ) -> E.PengajuanKartu:
        _wajib_login(konteks, desa_id)
        p = await self._ambil_pengajuan(desa_id, id_)
        if aksi in ("setuju", "tolak", "minta_revisi"):
            _wajib_pengelola(konteks, desa_id)
        elif aksi == "ajukan":
            await self._cek_pemilik_subjek(konteks, desa_id, p.subjek_tipe, p.subjek_id)
        dari = p.status
        ke = mesin_status.transisi("pengajuan_kartu", dari, aksi)
        p.status = ke
        if aksi in ("setuju", "tolak", "minta_revisi"):
            p.validator_id = konteks.pengguna_id
            p.catatan = catatan
        if ke == StatusPengajuanKartu.tervalidasi.value:
            p.divalidasi_pada = _now()
        await self.store.pengajuan_kartu.simpan(p)
        await self.store.kurasi_log.simpan(E.KurasiLog(
            entitas_tipe="pengajuan_kartu",
            entitas_id=p.id,
            dari_status=dari,
            ke_status=ke,
            kurator_id=konteks.pengguna_id,
            keputusan=aksi,
            catatan=catatan,
        ))
        if ke == StatusPengajuanKartu.tervalidasi.value:
            await self.hitung_ulang_sertifikasi(desa_id, p.subjek_tipe, p.subjek_id)
        return p

    async def hitung_ulang_sertifikasi(
        self, desa_id: UUID, subjek_tipe: str, subjek_id: UUID,
    ) -> E.SertifikasiOwner | None:
        kartu_map = {k.id: k for k in await self.store.kartu_aksi.semua()}
        tervalidasi = await self.store.pengajuan_kartu.cari(
            desa_id=desa_id, subjek_tipe=subjek_tipe, subjek_id=subjek_id,
            status=StatusPengajuanKartu.tervalidasi.value,
        )
        kartu_unik = {p.kartu_id for p in tervalidasi}
        skor = sum(kartu_map[kid].bobot for kid in kartu_unik if kid in kartu_map)
        tingkat = tingkat_dari_skor(skor)
        if tingkat is None:
            return None
        return await self.store.sertifikasi_owner.upsert(E.SertifikasiOwner(
            desa_id=desa_id,
            subjek_tipe=subjek_tipe,
            subjek_id=subjek_id,
            tingkat=tingkat,
            skor=skor,
            diperbarui_pada=_now(),
        ))

    async def ambil_sertifikasi(
        self, desa_id: UUID, subjek_tipe: str, subjek_id: UUID,
    ) -> dict | None:
        rows = await self.store.sertifikasi_owner.cari(
            desa_id=desa_id, subjek_tipe=subjek_tipe, subjek_id=subjek_id,
        )
        if not rows:
            return None
        s = rows[0]
        return {
            "subjek_tipe": s.subjek_tipe,
            "subjek_id": str(s.subjek_id),
            "tingkat": s.tingkat,
            "skor": s.skor,
            "diperbarui_pada": s.diperbarui_pada.isoformat() if s.diperbarui_pada else None,
        }

    async def _ambil_pengajuan(self, desa_id: UUID, id_: UUID) -> E.PengajuanKartu:
        p = await self.store.pengajuan_kartu.ambil(id_)
        if p is None or p.desa_id != desa_id:
            raise TidakDitemukan("Pengajuan tak ditemukan.")
        return p

    def _dto_kartu(self, k: E.KartuAksi) -> dict:
        return {
            "id": k.id,
            "kode": k.kode,
            "nama": k.nama,
            "deskripsi": k.deskripsi,
            "kenapa_penting": k.kenapa_penting,
            "bukti_dibutuhkan": k.bukti_dibutuhkan,
            "bobot": k.bobot,
        }

    async def _dto_pengajuan(self, p: E.PengajuanKartu) -> dict:
        kartu = await self.store.kartu_aksi.ambil(p.kartu_id)
        validator = None
        if p.validator_id:
            v = await self.store.pengguna.ambil(p.validator_id)
            if v:
                validator = {"id": str(v.id), "nama": v.nama}
        return {
            "id": str(p.id),
            "subjek_tipe": p.subjek_tipe,
            "subjek_id": str(p.subjek_id),
            "kartu": {"id": p.kartu_id, "nama": kartu.nama if kartu else ""},
            "bukti": p.bukti,
            "status": p.status,
            "validator": validator,
            "catatan": p.catatan,
            "dibuat_pada": p.dibuat_pada.isoformat() if p.dibuat_pada else None,
            "divalidasi_pada": p.divalidasi_pada.isoformat() if p.divalidasi_pada else None,
        }

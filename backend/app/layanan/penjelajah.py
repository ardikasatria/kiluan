"""Penjelajah Lestari F2 — misi, stempel, verifikasi, paspor (SQL + PostGIS)."""
from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from app.domain.enums import KodePeran
from app.domain.errors import (
    BuktiKurang,
    DiLuarGeofence,
    KesalahanValidasi,
    TidakBerwenang,
    TidakDitemukan,
    TransisiIlegalF2,
)
from app.domain.konteks import Konteks
from app.model import tabel as M
from app.inti.outbox import Outbox
from app.repo.f2_sql import (
    RepoMisiSQL,
    RepoPasporLestariSQL,
    RepoStasiunLestariSQL,
    RepoStempelSQL,
    RepoVerifikasiSQL,
    _qr_token,
)

VERIFIKATOR = frozenset({KodePeran.agen, KodePeran.kontributor, KodePeran.perangkat_desa, KodePeran.admin})
PENGELOLA = frozenset({KodePeran.kontributor, KodePeran.perangkat_desa, KodePeran.admin})


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _pengelola(konteks: Konteks, desa_id: UUID) -> bool:
    return konteks.admin_global() or bool(konteks.peran_di(desa_id) & PENGELOLA)


def _verifikator(konteks: Konteks, desa_id: UUID) -> bool:
    return konteks.admin_global() or bool(konteks.peran_di(desa_id) & VERIFIKATOR)


class PenjelajahLayanan:
    def __init__(self, store):
        self.store = store
        s = store.sesi
        self.misi = RepoMisiSQL(s)
        self.stasiun = RepoStasiunLestariSQL(s)
        self.paspor = RepoPasporLestariSQL(s)
        self.stempel = RepoStempelSQL(s)
        self.verifikasi = RepoVerifikasiSQL(s)
        self.outbox = Outbox(store)

    async def _emit_stempel_terverifikasi(self, desa_id: UUID, stempel: M.Stempel) -> None:
        paspor = await self.paspor.wajib(stempel.paspor_id, desa_id)
        await self.outbox.emit(
            desa_id,
            "stempel_terverifikasi",
            "stempel",
            stempel.id,
            {"pengguna_id": str(paspor.pengguna_id), "misi_id": str(stempel.misi_id)},
        )

    async def daftar_misi(
        self,
        desa_id: UUID,
        jenis: str | None = None,
        kategori: str | None = None,
        stasiun_id: UUID | None = None,
    ) -> list[M.Misi]:
        return await self.misi.daftar(desa_id, jenis=jenis, kategori=kategori, stasiun_id=stasiun_id)

    async def detail_misi(self, desa_id: UUID, id_atau_kode: str) -> M.Misi:
        try:
            mid = UUID(id_atau_kode)
            row = await self.misi.ambil(mid, desa_id)
        except ValueError:
            row = await self.misi.ambil_kode(id_atau_kode, desa_id)
        if row is None or not row.aktif:
            raise TidakDitemukan("Misi tidak ditemukan.")
        return row

    async def buat_misi(self, konteks: Konteks, desa_id: UUID, data: dict[str, Any]) -> M.Misi:
        if not _pengelola(konteks, desa_id):
            raise TidakBerwenang("Hanya pengelola desa yang boleh membuat misi.")
        kode = data.get("kode") or f"M-{secrets.token_hex(3).upper()}"
        row = M.Misi(
            id=uuid4(),
            desa_id=desa_id,
            kode=kode,
            judul=data["judul"],
            deskripsi=data.get("deskripsi"),
            jenis=data["jenis"],
            kategori=data["kategori"],
            micro_lesson=data.get("micro_lesson"),
            syarat_verifikasi=data.get("syarat_verifikasi") or {},
            stasiun_id=UUID(data["stasiun_id"]) if data.get("stasiun_id") else None,
            poin=int(data.get("poin") or 0),
            dampak_template=data.get("dampak_template") or {},
            aktif=bool(data.get("aktif", True)),
            dibuat_pada=_now(),
        )
        return await self.misi.simpan(row)

    async def ubah_misi(
        self, konteks: Konteks, desa_id: UUID, misi_id: UUID, data: dict[str, Any],
    ) -> M.Misi:
        if not _pengelola(konteks, desa_id):
            raise TidakBerwenang("Hanya pengelola desa yang boleh mengubah misi.")
        row = await self.misi.wajib(misi_id, desa_id)
        for k in ("judul", "deskripsi", "jenis", "kategori", "micro_lesson", "syarat_verifikasi",
                  "dampak_template", "aktif", "poin"):
            if k in data and data[k] is not None:
                setattr(row, k, data[k])
        if "stasiun_id" in data:
            row.stasiun_id = UUID(data["stasiun_id"]) if data["stasiun_id"] else None
        await self.store.sesi.flush()
        return row

    async def daftar_stasiun(self, desa_id: UUID, aktif_only: bool = True) -> list[M.StasiunLestari]:
        return await self.stasiun.daftar(desa_id, aktif_only=aktif_only)

    async def buat_stasiun(self, konteks: Konteks, desa_id: UUID, data: dict[str, Any]) -> M.StasiunLestari:
        if not _pengelola(konteks, desa_id):
            raise TidakBerwenang("Hanya pengelola desa yang boleh membuat stasiun.")
        lok = data.get("lokasi") or {}
        row = M.StasiunLestari(
            id=uuid4(),
            desa_id=desa_id,
            nama=data["nama"],
            tipe=data["tipe"],
            destinasi_id=UUID(data["destinasi_id"]) if data.get("destinasi_id") else None,
            qr_token=data.get("qr_token") or _qr_token(),
            radius_m=int(data.get("radius_m") or 50),
            aktif=bool(data.get("aktif", True)),
            dibuat_pada=_now(),
        )
        lat, lng = lok.get("lat"), lok.get("lng")
        return await self.stasiun.simpan(
            row,
            lat=float(lat) if lat is not None else None,
            lng=float(lng) if lng is not None else None,
        )

    async def ubah_stasiun(
        self, konteks: Konteks, desa_id: UUID, stasiun_id: UUID, data: dict[str, Any],
    ) -> M.StasiunLestari:
        if not _pengelola(konteks, desa_id):
            raise TidakBerwenang("Hanya pengelola desa yang boleh mengubah stasiun.")
        row = await self.stasiun.wajib(stasiun_id, desa_id)
        for k in ("nama", "tipe", "radius_m", "aktif"):
            if k in data and data[k] is not None:
                setattr(row, k, data[k])
        if data.get("rotasi_qr"):
            row.qr_token = _qr_token()
        lok = data.get("lokasi")
        if lok and lok.get("lat") is not None and lok.get("lng") is not None:
            from app.repo.f2_sql import _set_lokasi_stasiun
            await _set_lokasi_stasiun(self.store.sesi, row.id, float(lok["lat"]), float(lok["lng"]))
        await self.store.sesi.flush()
        return row

    async def nonaktifkan_stasiun(self, konteks: Konteks, desa_id: UUID, stasiun_id: UUID) -> None:
        if not _pengelola(konteks, desa_id):
            raise TidakBerwenang("Hanya pengelola desa yang boleh menonaktifkan stasiun.")
        row = await self.stasiun.wajib(stasiun_id, desa_id)
        row.aktif = False
        await self.store.sesi.flush()

    async def _paspor_atau_buat(self, desa_id: UUID, pengguna_id: UUID) -> M.PasporLestari:
        p = await self.paspor.ambil_pengguna(desa_id, pengguna_id)
        if p:
            return p
        p = M.PasporLestari(
            id=uuid4(),
            desa_id=desa_id,
            pengguna_id=pengguna_id,
            ringkasan_dampak={},
            total_stempel=0,
            dibuat_pada=_now(),
            diperbarui_pada=_now(),
        )
        return await self.paspor.simpan(p)

    async def _bump_paspor(self, stempel: M.Stempel) -> None:
        paspor = await self.paspor.wajib(stempel.paspor_id, stempel.desa_id)
        dampak = stempel.dampak or {}
        ringkas = dict(paspor.ringkasan_dampak or {})
        for k, v in dampak.items():
            ringkas[k] = ringkas.get(k, 0) + v
        paspor.ringkasan_dampak = ringkas
        paspor.total_stempel += 1
        paspor.diperbarui_pada = _now()
        await self.store.sesi.flush()

    async def selesaikan_misi(
        self,
        konteks: Konteks,
        desa_id: UUID,
        misi_id: UUID,
        bukti: dict | None = None,
        dampak: dict | None = None,
        booking_id: UUID | None = None,
    ) -> dict[str, Any]:
        if konteks.pengguna_id is None:
            raise TidakBerwenang("Perlu masuk untuk menyelesaikan misi.")
        misi = await self.misi.wajib(misi_id, desa_id)
        if not misi.aktif:
            raise TidakDitemukan("Misi tidak tersedia.")
        if misi.jenis == "aksi":
            paspor_cek = await self._paspor_atau_buat(desa_id, konteks.pengguna_id)
            if not await self.stempel.punya_belajar_terverifikasi(
                desa_id, paspor_cek.id, misi.kategori,
            ):
                raise KesalahanValidasi(
                    f"Selesaikan misi belajar kategori {misi.kategori} terlebih dahulu."
                )

        bukti = bukti or {}
        syarat = misi.syarat_verifikasi or {}
        metode = syarat.get("metode", "otomatis")
        paspor = await self._paspor_atau_buat(desa_id, konteks.pengguna_id)
        lok = bukti.get("lokasi") or {}
        lat, lng = lok.get("lat"), lok.get("lng")

        if syarat.get("bukti", {}).get("foto") and not bukti.get("foto_media_id"):
            raise BuktiKurang("Foto bukti wajib.")

        stempel = M.Stempel(
            id=uuid4(),
            desa_id=desa_id,
            paspor_id=paspor.id,
            misi_id=misi.id,
            booking_id=booking_id,
            stasiun_id=misi.stasiun_id,
            dampak=dampak or dict(misi.dampak_template or {}),
            status="menunggu_verifikasi",
            media_id=UUID(bukti["foto_media_id"]) if bukti.get("foto_media_id") else None,
            dibuat_pada=_now(),
        )
        verif = M.Verifikasi(
            id=uuid4(),
            desa_id=desa_id,
            entitas_tipe="stempel",
            entitas_id=stempel.id,
            metode=metode,
            syarat=syarat,
            bukti=bukti,
            hasil="menunggu",
            dibuat_pada=_now(),
        )

        if metode == "otomatis":
            verif.hasil = "valid"
        elif metode == "qr_checkin":
            if not misi.stasiun_id:
                raise BuktiKurang("Misi tanpa stasiun.")
            stasiun = await self.stasiun.wajib(misi.stasiun_id, desa_id)
            if bukti.get("qr_token") != stasiun.qr_token:
                raise BuktiKurang("QR token tidak valid.")
            if lat is None or lng is None:
                raise BuktiKurang("Lokasi wajib untuk check-in QR.")
            if not await self.stasiun.dalam_geofence(
                stasiun.id, float(lat), float(lng), stasiun.radius_m,
            ):
                raise DiLuarGeofence("Di luar radius stasiun.")
            verif.hasil = "valid"
        elif metode == "konfirmasi_pemandu":
            verif.hasil = "menunggu"
        else:
            verif.hasil = "menunggu"

        if verif.hasil == "valid":
            verif.diputuskan_pada = _now()
            stempel.status = "terverifikasi"

        lat_f = float(lat) if lat is not None else None
        lng_f = float(lng) if lng is not None else None
        await self.stempel.simpan(stempel, lat=lat_f, lng=lng_f)
        await self.verifikasi.simpan(verif)
        if stempel.status == "terverifikasi":
            await self._bump_paspor(stempel)
            await self._emit_stempel_terverifikasi(desa_id, stempel)
        return {"stempel": stempel, "verifikasi": verif}

    async def paspor_saya(self, konteks: Konteks, desa_id: UUID) -> dict[str, Any]:
        if konteks.pengguna_id is None:
            raise TidakBerwenang("Perlu masuk untuk melihat paspor.")
        paspor = await self._paspor_atau_buat(desa_id, konteks.pengguna_id)
        stempel_list = await self.stempel.daftar_paspor(desa_id, paspor.id)
        return {"paspor": paspor, "stempel": stempel_list}

    async def stempel_saya(
        self, konteks: Konteks, desa_id: UUID, status: str | None = None,
    ) -> list[M.Stempel]:
        if konteks.pengguna_id is None:
            raise TidakBerwenang("Perlu masuk untuk melihat stempel.")
        paspor = await self._paspor_atau_buat(desa_id, konteks.pengguna_id)
        return await self.stempel.daftar_paspor(desa_id, paspor.id, status=status)

    async def daftar_verifikasi(
        self,
        konteks: Konteks,
        desa_id: UUID,
        entitas_tipe: str | None = None,
        hasil: str | None = None,
    ) -> list[M.Verifikasi]:
        if not _verifikator(konteks, desa_id):
            raise TidakBerwenang("Bukan verifikator berwenang.")
        return await self.verifikasi.daftar(desa_id, entitas_tipe=entitas_tipe, hasil=hasil)

    async def putuskan_verifikasi(
        self,
        konteks: Konteks,
        desa_id: UUID,
        verifikasi_id: UUID,
        hasil: str,
        catatan: str = "",
    ) -> M.Verifikasi:
        if not _verifikator(konteks, desa_id):
            raise TidakBerwenang("Bukan verifikator berwenang.")
        v = await self.verifikasi.wajib(verifikasi_id, desa_id)
        if v.hasil != "menunggu":
            raise TransisiIlegalF2("Verifikasi sudah diputus.")
        if hasil not in ("valid", "invalid"):
            raise KesalahanValidasi("hasil harus valid|invalid.")
        if v.entitas_tipe == "monitoring_ekologi":
            from app.layanan.monitoring import MonitoringLayanan
            await MonitoringLayanan(self.store).putuskan_verifikasi(
                konteks, desa_id, verifikasi_id, hasil, catatan,
            )
            return await self.verifikasi.wajib(verifikasi_id, desa_id)
        v.hasil = hasil
        v.verifikator_id = konteks.pengguna_id
        v.diputuskan_pada = _now()
        if catatan:
            bukti = dict(v.bukti or {})
            bukti["catatan_verifikator"] = catatan
            v.bukti = bukti
        stempel = await self.stempel.wajib(v.entitas_id, desa_id)
        if hasil == "valid":
            stempel.status = "terverifikasi"
            await self._bump_paspor(stempel)
            await self._emit_stempel_terverifikasi(desa_id, stempel)
        else:
            stempel.status = "ditolak"
        await self.store.sesi.flush()
        return v

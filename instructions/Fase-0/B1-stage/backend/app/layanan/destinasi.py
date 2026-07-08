"""Destinasi Kiluan — manajemen destinasi + pencarian publik (async)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from ..domain import konteks as ctx
from ..domain import rbac
from ..domain.entitas import Destinasi
from ..domain.enums import StatusKonten
from ..domain.errors import KesalahanValidasi, TidakDitemukan
from ..domain.geo import jarak_m
from ..domain.paginasi import keyset
from ..skema.destinasi import DestinasiBuat, DestinasiUbah


def _now() -> datetime:
    return datetime.now(timezone.utc)


class DestinasiLayanan:
    def __init__(self, store):
        self.store = store

    async def buat(self, konteks: ctx.Konteks, desa_id: UUID, data: DestinasiBuat) -> Destinasi:
        ctx.wajib(konteks, rbac.KELOLA_DESTINASI, desa_id)
        if await self.store.kategori.ambil(data.kategori_id) is None:
            raise KesalahanValidasi("kategori_id tidak dikenal")
        status = data.status
        if status == StatusKonten.publikasi:
            ctx.wajib(konteks, rbac.PUBLIKASI_DESTINASI, desa_id)
        d = Destinasi(
            desa_id=desa_id, slug=data.slug, nama=data.nama, kategori_id=data.kategori_id,
            lokasi=(data.lokasi.lat, data.lokasi.lng), deskripsi=data.deskripsi, area=data.area,
            alamat=data.alamat, jam_operasional=data.jam_operasional, status=status,
            dibuat_oleh=konteks.pengguna_id,
        )
        return await self.store.destinasi.tambah(d)

    async def _ambil_milik(self, desa_id: UUID, id: UUID, *, publik: bool) -> Destinasi:
        d = await self.store.destinasi.ambil(id)
        if d is None or d.desa_id != desa_id or d.dihapus_pada is not None:
            raise TidakDitemukan("destinasi tidak ditemukan")
        if publik and d.status != StatusKonten.publikasi:
            raise TidakDitemukan("destinasi tidak ditemukan")
        return d

    async def ubah(self, konteks: ctx.Konteks, desa_id: UUID, id: UUID, data: DestinasiUbah) -> Destinasi:
        ctx.wajib(konteks, rbac.KELOLA_DESTINASI, desa_id)
        d = await self._ambil_milik(desa_id, id, publik=False)
        for f in ("nama", "deskripsi", "kategori_id", "alamat", "jam_operasional"):
            v = getattr(data, f)
            if v is not None:
                setattr(d, f, v)
        if data.lokasi is not None:
            d.lokasi = (data.lokasi.lat, data.lokasi.lng)
        return d

    async def ubah_status(self, konteks: ctx.Konteks, desa_id: UUID, id: UUID, status: StatusKonten) -> Destinasi:
        ctx.wajib(konteks, rbac.KELOLA_DESTINASI, desa_id)
        if status == StatusKonten.publikasi:
            ctx.wajib(konteks, rbac.PUBLIKASI_DESTINASI, desa_id)
        d = await self._ambil_milik(desa_id, id, publik=False)
        d.status = status
        return d

    async def hapus(self, konteks: ctx.Konteks, desa_id: UUID, id: UUID) -> None:
        ctx.wajib(konteks, rbac.KELOLA_DESTINASI, desa_id)
        d = await self._ambil_milik(desa_id, id, publik=False)
        d.dihapus_pada = _now()

    async def detail(self, konteks: ctx.Konteks, desa_id: UUID, id_atau_slug):
        publik = not ctx.boleh(konteks, rbac.KELOLA_DESTINASI, desa_id)
        if isinstance(id_atau_slug, UUID):
            d = await self.store.destinasi.ambil(id_atau_slug)
        else:
            d = await self.store.destinasi.ambil_slug(desa_id, id_atau_slug)
        if d is None or d.desa_id != desa_id or d.dihapus_pada is not None:
            raise TidakDitemukan("destinasi tidak ditemukan")
        if publik and d.status != StatusKonten.publikasi:
            raise TidakDitemukan("destinasi tidak ditemukan")
        return d

    async def cari(self, konteks: ctx.Konteks, desa_id: UUID, *, kategori_id: Optional[int] = None,
                   tag: Optional[str] = None, q: Optional[str] = None,
                   dekat: Optional[tuple[float, float]] = None, radius_m: Optional[float] = None,
                   batas: int = 20, kursor: Optional[str] = None) -> dict:
        publik = not ctx.boleh(konteks, rbac.KELOLA_DESTINASI, desa_id)
        rows = [d for d in await self.store.destinasi.daftar(desa_id) if d.dihapus_pada is None]
        if publik:
            rows = [d for d in rows if d.status == StatusKonten.publikasi]
        if kategori_id is not None:
            rows = [d for d in rows if d.kategori_id == kategori_id]
        if tag is not None:
            rows = [d for d in rows if tag in d.tag_kode]
        if q:
            ql = q.lower()
            rows = [d for d in rows if ql in d.nama.lower() or (d.deskripsi and ql in d.deskripsi.lower())]
        if dekat is not None:
            lat, lng = dekat
            hasil = []
            for d in rows:
                jm = jarak_m(lat, lng, d.lokasi[0], d.lokasi[1])
                if radius_m is None or jm <= radius_m:
                    hasil.append((d, jm))
            hasil.sort(key=lambda x: x[1])
            item = [{"destinasi": d, "jarak_m": round(jm, 1)} for d, jm in hasil[:batas]]
            return {"item": item, "meta": {"kursor_berikutnya": None, "ada_lagi": len(hasil) > batas, "batas": batas}}
        hal = keyset(rows, batas=batas, kursor=kursor)
        return {"item": [{"destinasi": d, "jarak_m": None} for d in hal.item], "meta": hal.meta()}

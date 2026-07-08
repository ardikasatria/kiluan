"""Layanan wisata (kepemilikan) & Gerbang discovery lintas-desa (async)."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from ..domain import konteks as ctx
from ..domain import rbac
from ..domain.entitas import Layanan
from ..domain.enums import JenisLayanan, SatuanHarga, StatusKonten
from ..domain.errors import TidakBerwenang, TidakDitemukan
from ..domain.geo import jarak_m
from ..domain.paginasi import keyset


class LayananWisataLayanan:
    def __init__(self, store):
        self.store = store

    async def buat(self, konteks: ctx.Konteks, desa_id: UUID, *, nama: str, jenis: JenisLayanan,
                   harga: float, satuan_harga: SatuanHarga, destinasi_id: Optional[UUID] = None,
                   penyedia_id: Optional[UUID] = None, status: StatusKonten = StatusKonten.draft) -> Layanan:
        ctx.wajib(konteks, rbac.KELOLA_LAYANAN_SENDIRI, desa_id)
        pengelola = ctx.boleh(konteks, rbac.KELOLA_LAYANAN_DESA, desa_id)
        if not pengelola:
            penyedia_id = konteks.pengguna_id
        l = Layanan(desa_id=desa_id, nama=nama, jenis=jenis, harga=harga, satuan_harga=satuan_harga,
                    destinasi_id=destinasi_id, penyedia_id=penyedia_id, status=status)
        return await self.store.layanan.tambah(l)

    async def ubah(self, konteks: ctx.Konteks, desa_id: UUID, id: UUID, **ubah) -> Layanan:
        l = await self.store.layanan.ambil(id)
        if l is None or l.desa_id != desa_id or l.dihapus_pada is not None:
            raise TidakDitemukan("layanan tidak ditemukan")
        pengelola = ctx.boleh(konteks, rbac.KELOLA_LAYANAN_DESA, desa_id)
        pemilik = l.penyedia_id is not None and l.penyedia_id == konteks.pengguna_id
        if not (pengelola or pemilik):
            raise TidakBerwenang("hanya penyedia atau pengelola desa yang boleh mengubah")
        for k, v in ubah.items():
            setattr(l, k, v)
        return l

    async def daftar(
        self,
        konteks: ctx.Konteks,
        desa_id: UUID,
        *,
        jenis=None,
        destinasi_id: Optional[UUID] = None,
        status=None,
    ) -> list[Layanan]:
        publik = not (
            ctx.boleh(konteks, rbac.KELOLA_LAYANAN_DESA, desa_id)
            or ctx.boleh(konteks, rbac.KELOLA_LAYANAN_SENDIRI, desa_id)
        )
        rows = [l for l in await self.store.layanan.daftar(desa_id) if l.dihapus_pada is None]
        if publik:
            rows = [l for l in rows if l.status == StatusKonten.publikasi]
        if jenis is not None:
            rows = [l for l in rows if l.jenis == jenis]
        if destinasi_id is not None:
            rows = [l for l in rows if l.destinasi_id == destinasi_id]
        if status is not None:
            rows = [l for l in rows if l.status == status]
        return rows

    async def hapus(self, konteks: ctx.Konteks, desa_id: UUID, id: UUID) -> None:
        l = await self.store.layanan.ambil(id)
        if l is None or l.desa_id != desa_id or l.dihapus_pada is not None:
            raise TidakDitemukan("layanan tidak ditemukan")
        pengelola = ctx.boleh(konteks, rbac.KELOLA_LAYANAN_DESA, desa_id)
        pemilik = l.penyedia_id is not None and l.penyedia_id == konteks.pengguna_id
        if not (pengelola or pemilik):
            raise TidakBerwenang("hanya penyedia atau pengelola desa yang boleh menghapus")
        from datetime import datetime, timezone
        l.dihapus_pada = datetime.now(timezone.utc)


class DiscoveryLayanan:
    """Gerbang publik lintas-desa (Kontrak §4.1–4.2). Hanya `desa aktif`,
    destinasi `publikasi` & bukan soft-deleted. Keyset stabil; `dekat` → jarak."""

    def __init__(self, store):
        self.store = store

    async def daftar_desa(
        self,
        *,
        q: Optional[str] = None,
        dekat: Optional[tuple[float, float]] = None,
        radius_m: Optional[float] = None,
        batas: int = 20,
        kursor: Optional[str] = None,
    ) -> dict:
        rows = await self.store.desa.daftar_aktif()
        if q:
            ql = q.lower()
            rows = [d for d in rows if ql in d.nama.lower() or ql in d.slug.lower()]
        if dekat is not None:
            return _paginasi_jarak(rows, dekat, radius_m, batas, kunci="desa",
                                   lokasi=lambda d: getattr(d, "lokasi", None))
        hal = keyset(rows, batas=batas, kursor=kursor)
        return {"item": [{"desa": d, "jarak_m": None} for d in hal.item], "meta": hal.meta()}

    async def cari_destinasi(
        self,
        *,
        desa_slug: Optional[str] = None,
        kategori_id: Optional[int] = None,
        tag: Optional[str] = None,
        q: Optional[str] = None,
        dekat: Optional[tuple[float, float]] = None,
        radius_m: Optional[float] = None,
        batas: int = 20,
        kursor: Optional[str] = None,
    ) -> dict:
        kosong = {"item": [], "meta": {"kursor_berikutnya": None, "ada_lagi": False, "batas": batas}}
        aktif_id = {d.id for d in await self.store.desa.daftar_aktif()}
        if desa_slug is not None:
            d = await self.store.desa.ambil_slug(desa_slug)
            if d is None or d.id not in aktif_id:
                return kosong
            aktif_id = {d.id}
        rows = [r for r in await self.store.destinasi.semua_desa_aktif(aktif_id)
                if r.dihapus_pada is None and r.status == StatusKonten.publikasi]
        if kategori_id is not None:
            rows = [r for r in rows if r.kategori_id == kategori_id]
        if tag is not None:
            rows = [r for r in rows if tag in r.tag_kode]
        if q:
            ql = q.lower()
            rows = [r for r in rows if ql in r.nama.lower() or (r.deskripsi and ql in r.deskripsi.lower())]
        if dekat is not None:
            return _paginasi_jarak(rows, dekat, radius_m, batas, kunci="destinasi",
                                   lokasi=lambda r: r.lokasi)
        hal = keyset(rows, batas=batas, kursor=kursor)
        return {"item": [{"destinasi": r, "jarak_m": None} for r in hal.item], "meta": hal.meta()}


def _paginasi_jarak(rows, dekat, radius_m, batas, *, kunci, lokasi) -> dict:
    lat, lng = dekat
    hasil = []
    for r in rows:
        lok = lokasi(r)
        if lok is None:
            continue
        jm = jarak_m(lat, lng, lok[0], lok[1])
        if radius_m is None or jm <= radius_m:
            hasil.append((r, jm))
    hasil.sort(key=lambda x: x[1])
    item = [{kunci: r, "jarak_m": round(jm, 1)} for r, jm in hasil[:batas]]
    return {"item": item, "meta": {"kursor_berikutnya": None, "ada_lagi": len(hasil) > batas, "batas": batas}}

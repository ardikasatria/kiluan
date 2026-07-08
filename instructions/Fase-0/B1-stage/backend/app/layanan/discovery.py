"""Layanan wisata (kepemilikan) & Gerbang discovery lintas-desa (async)."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from ..domain import konteks as ctx
from ..domain import rbac
from ..domain.entitas import Layanan
from ..domain.enums import JenisLayanan, SatuanHarga, StatusKonten
from ..domain.errors import TidakBerwenang, TidakDitemukan


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


class DiscoveryLayanan:
    def __init__(self, store):
        self.store = store

    async def daftar_desa(self) -> list:
        return await self.store.desa.daftar_aktif()

    async def cari_destinasi(self, *, q: Optional[str] = None) -> list:
        aktif = {d.id for d in await self.store.desa.daftar_aktif()}
        rows = [d for d in await self.store.destinasi.semua_desa_aktif(aktif)
                if d.dihapus_pada is None and d.status == StatusKonten.publikasi]
        if q:
            ql = q.lower()
            rows = [d for d in rows if ql in d.nama.lower()]
        return rows

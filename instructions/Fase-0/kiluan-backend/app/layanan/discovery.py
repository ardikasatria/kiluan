"""Layanan wisata (kepemilikan penyedia) & Gerbang discovery lintas-desa."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from ..domain import konteks as ctx
from ..domain import rbac
from ..domain.entitas import Layanan
from ..domain.enums import JenisLayanan, KodePeran, SatuanHarga, StatusKonten
from ..domain.errors import TidakBerwenang, TidakDitemukan


class LayananWisataLayanan:
    """Nama panjang untuk hindari bentrok istilah 'layanan' (service vs entitas)."""

    def __init__(self, store):
        self.store = store

    def buat(
        self,
        konteks: ctx.Konteks,
        desa_id: UUID,
        *,
        nama: str,
        jenis: JenisLayanan,
        harga: float,
        satuan_harga: SatuanHarga,
        destinasi_id: Optional[UUID] = None,
        penyedia_id: Optional[UUID] = None,
        status: StatusKonten = StatusKonten.draft,
    ) -> Layanan:
        # umkm/agen boleh buat (jadi penyedia dirinya); pengelola boleh semua.
        ctx.wajib(konteks, rbac.KELOLA_LAYANAN_SENDIRI, desa_id)
        pengelola = ctx.boleh(konteks, rbac.KELOLA_LAYANAN_DESA, desa_id)
        if not pengelola:
            # penyedia non-pengelola hanya boleh mengatasnamakan dirinya sendiri
            penyedia_id = konteks.pengguna_id
        l = Layanan(
            desa_id=desa_id,
            nama=nama,
            jenis=jenis,
            harga=harga,
            satuan_harga=satuan_harga,
            destinasi_id=destinasi_id,
            penyedia_id=penyedia_id,
            status=status,
        )
        return self.store.layanan.tambah(l)

    def ubah(self, konteks: ctx.Konteks, desa_id: UUID, id: UUID, **ubah) -> Layanan:
        l = self.store.layanan.ambil(id)
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

    def daftar_desa(self) -> list:
        return self.store.desa.daftar_aktif()

    def cari_destinasi(self, *, q: Optional[str] = None) -> list:
        aktif = {d.id for d in self.store.desa.daftar_aktif()}
        rows = [
            d
            for d in self.store.destinasi.semua_desa_aktif(aktif)
            if d.dihapus_pada is None and d.status == StatusKonten.publikasi
        ]
        if q:
            ql = q.lower()
            rows = [d for d in rows if ql in d.nama.lower()]
        return rows

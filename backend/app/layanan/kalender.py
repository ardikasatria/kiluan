"""Kalender aktivitas destinasi (async)."""
from __future__ import annotations

from datetime import date, time
from typing import Optional
from uuid import UUID

from ..domain import konteks as ctx
from ..domain import rbac
from ..domain.enums import StatusKalender, TipeKalender
from ..domain.errors import TidakDitemukan


class KalenderLayanan:
    def __init__(self, store):
        self.store = store

    async def _ambil_milik(self, desa_id: UUID, id: UUID, *, publik: bool):
        row = await self.store.kalender.ambil(id)
        if row is None or row.desa_id != desa_id:
            raise TidakDitemukan("kalender tidak ditemukan")
        if publik and row.status != StatusKalender.aktif:
            raise TidakDitemukan("kalender tidak ditemukan")
        return row

    async def daftar(
        self,
        konteks: ctx.Konteks,
        desa_id: UUID,
        *,
        destinasi_id: Optional[UUID] = None,
        tipe: Optional[TipeKalender] = None,
    ) -> list:
        publik = not ctx.boleh(konteks, rbac.KELOLA_KALENDER, desa_id)
        rows = await self.store.kalender.daftar(desa_id)
        if publik:
            rows = [r for r in rows if r.status == StatusKalender.aktif]
        if destinasi_id is not None:
            rows = [r for r in rows if r.destinasi_id == destinasi_id]
        if tipe is not None:
            rows = [r for r in rows if r.tipe == tipe]
        return rows

    async def detail(self, konteks: ctx.Konteks, desa_id: UUID, id: UUID):
        publik = not ctx.boleh(konteks, rbac.KELOLA_KALENDER, desa_id)
        return await self._ambil_milik(desa_id, id, publik=publik)

    async def buat(
        self,
        konteks: ctx.Konteks,
        desa_id: UUID,
        *,
        judul: str,
        tipe: TipeKalender,
        waktu_mulai: time,
        waktu_selesai: time,
        berlaku_mulai: date,
        destinasi_id: Optional[UUID] = None,
        deskripsi: Optional[str] = None,
        pengulangan: Optional[dict] = None,
        berlaku_sampai: Optional[date] = None,
        status: StatusKalender = StatusKalender.aktif,
    ):
        ctx.wajib(konteks, rbac.KELOLA_KALENDER, desa_id)
        from ..model import tabel as M

        row = M.KalenderAktivitas(
            desa_id=desa_id,
            destinasi_id=destinasi_id,
            judul=judul,
            deskripsi=deskripsi,
            tipe=tipe.value if hasattr(tipe, "value") else tipe,
            waktu_mulai=waktu_mulai,
            waktu_selesai=waktu_selesai,
            pengulangan=pengulangan,
            berlaku_mulai=berlaku_mulai,
            berlaku_sampai=berlaku_sampai,
            status=status.value if hasattr(status, "value") else status,
        )
        return await self.store.kalender.tambah(row)

    async def ubah(self, konteks: ctx.Konteks, desa_id: UUID, id: UUID, **ubah):
        ctx.wajib(konteks, rbac.KELOLA_KALENDER, desa_id)
        row = await self._ambil_milik(desa_id, id, publik=False)
        for k, v in ubah.items():
            if v is not None:
                setattr(row, k, v.value if hasattr(v, "value") else v)
        return row

    async def hapus(self, konteks: ctx.Konteks, desa_id: UUID, id: UUID) -> None:
        ctx.wajib(konteks, rbac.KELOLA_KALENDER, desa_id)
        await self._ambil_milik(desa_id, id, publik=False)
        await self.store.kalender.hapus(id)

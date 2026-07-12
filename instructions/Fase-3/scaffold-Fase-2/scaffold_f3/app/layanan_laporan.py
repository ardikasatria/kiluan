"""Anjungan Data — laporan bulanan (draf → final).

Finalkan menyalin ringkasan + tandai final; finalkan periode yg sudah final → periode_final.
"""
from __future__ import annotations

from uuid import UUID

from . import errors as E
from .enums import StatusLaporan
from .model import LaporanBulanan
from .util import Jam, uuid7


class LayananLaporan:
    def __init__(self, repo_laporan, jam: Jam):
        self.laporan = repo_laporan
        self.jam = jam

    async def generate(self, desa_id: UUID, periode: str, ringkasan: dict) -> LaporanBulanan:
        lap = LaporanBulanan(id=uuid7(), desa_id=desa_id, periode=periode,
                             ringkasan=dict(ringkasan), status=StatusLaporan.draf,
                             dibuat_pada=self.jam.now())
        return await self.laporan.simpan(lap)

    async def finalkan(self, desa_id: UUID, laporan_id: UUID,
                       file_media_id: UUID | None = None) -> LaporanBulanan:
        lap = await self.laporan.ambil(desa_id, laporan_id)
        if lap is None:
            raise E.tidak_ditemukan()
        if lap.status == StatusLaporan.final:
            raise E.periode_final(f"laporan {lap.periode} sudah final")
        lap.status = StatusLaporan.final
        lap.file_media_id = file_media_id
        return await self.laporan.simpan(lap)

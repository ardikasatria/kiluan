"""Uji F3 — laporan bulanan."""
from __future__ import annotations

import pytest

from app.domain.errors import PeriodeFinal
from app.layanan.laporan import LaporanLayanan

PERIODE = "2026-06"


@pytest.fixture
def svc_laporan(store) -> LaporanLayanan:
    return LaporanLayanan(store)


@pytest.mark.asyncio
async def test_laporan_finalkan_dobel(svc_laporan, konteks_pengelola, desa_id):
    lap = await svc_laporan.generate(konteks_pengelola, desa_id, PERIODE)
    await svc_laporan.finalkan(konteks_pengelola, desa_id, lap.id)
    with pytest.raises(PeriodeFinal):
        await svc_laporan.finalkan(konteks_pengelola, desa_id, lap.id)

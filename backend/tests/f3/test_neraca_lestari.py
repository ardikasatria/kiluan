"""Uji F3 — neraca lestari & anti-greenwashing."""
from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest

from app.domain.errors import PeriodeFinal
from app.f3.enums import MetodeMonitoring, StatusMonitoring
from app.layanan.monitoring import MonitoringLayanan
from app.layanan.neraca_lestari import NeracaLestariLayanan
from app.model import tabel as M

TGL = date(2026, 6, 15)
PERIODE = "2026-06"


async def _monitoring_terverifikasi(svc_mon, store, konteks, desa_id, indikator_id):
    hasil = await svc_mon.catat(konteks, desa_id, {
        "indikator_id": indikator_id,
        "nilai": 85,
        "waktu_ukur": TGL.isoformat(),
        "metode": MetodeMonitoring.survei_lapangan.value,
        "lokasi": {"lat": -5.75, "lng": 105.12},
    })
    m = hasil["monitoring"]
    m.status = StatusMonitoring.terverifikasi.value
    await store.monitoring.simpan(m)
    return m


@pytest.mark.asyncio
async def test_hanya_terverifikasi_masuk_skor(
    store, desa_id, konteks_pencatat, indikator_mangrove,
):
    svc_mon = MonitoringLayanan(store)
    svc = NeracaLestariLayanan(store)
    await svc_mon.catat(konteks_pencatat, desa_id, {
        "indikator_id": indikator_mangrove.id,
        "nilai": 85,
        "waktu_ukur": TGL.isoformat(),
        "metode": MetodeMonitoring.survei_lapangan.value,
    })
    n0 = await svc.hitung(konteks_pencatat, desa_id, PERIODE)
    assert float(n0.skor_ekologi) == 0.0

    await _monitoring_terverifikasi(svc_mon, store, konteks_pencatat, desa_id, indikator_mangrove.id)
    n1 = await svc.hitung(konteks_pencatat, desa_id, PERIODE)
    assert float(n1.skor_ekologi) > 0.0


@pytest.mark.asyncio
async def test_anti_greenwashing(store, desa_id, konteks_pencatat, indikator_mangrove):
    svc = NeracaLestariLayanan(store)
    await store.stempel_neraca.simpan(
        M.Stempel(
            id=uuid4(), desa_id=desa_id, paspor_id=uuid4(), misi_id=uuid4(),
            dampak={"mangrove": 5}, status=StatusMonitoring.terverifikasi.value,
            dibuat_pada=datetime(2026, 6, 15, tzinfo=timezone.utc),
        )
    )
    n = await svc.hitung(konteks_pencatat, desa_id, PERIODE)
    assert float(n.skor_ekologi) == 0.0
    assert n.komponen["klaim_dampak_diklaim"] == 5
    assert n.komponen["klaim_dampak_tervalidasi"] == 0

    svc_mon = MonitoringLayanan(store)
    await _monitoring_terverifikasi(svc_mon, store, konteks_pencatat, desa_id, indikator_mangrove.id)
    n2 = await svc.hitung(konteks_pencatat, desa_id, PERIODE)
    assert n2.komponen["klaim_dampak_tervalidasi"] == 5
    assert float(n2.skor_ekologi) > 0.0


@pytest.mark.asyncio
async def test_periode_terkunci(store, desa_id, konteks_pencatat):
    svc = NeracaLestariLayanan(store)
    await svc.hitung(konteks_pencatat, desa_id, PERIODE)
    await svc.kunci(konteks_pencatat, desa_id, PERIODE)
    with pytest.raises(PeriodeFinal):
        await svc.hitung(konteks_pencatat, desa_id, PERIODE)

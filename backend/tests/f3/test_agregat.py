"""Uji F3 — agregat gold & outbox."""
from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import uuid4

import pytest

from app.domain.entitas import Peristiwa
from app.domain.errors import JobSedangBerjalan, KesalahanDomain, MetrikTidakDikenal
from app.f3.enums import JenisPeristiwaAnalitik, Lapisan, StatusJob
from app.f3.util import uuid7
from app.layanan.agregat import AgregatLayanan

TGL = date(2026, 6, 15)


async def _settle(store, desa_id, bruto, reinvest, penyedia=None):
    penyedia = penyedia or uuid4()
    await store.peristiwa.simpan(Peristiwa(
        desa_id=desa_id,
        jenis=JenisPeristiwaAnalitik.transaksi_settle.value,
        entitas_tipe="transaksi",
        entitas_id=uuid4(),
        muatan={
            "penyedia_id": str(penyedia),
            "bruto": bruto,
            "porsi_reinvestasi": reinvest,
            "tanggal": TGL.isoformat(),
        },
        dibuat_pada=datetime(2026, 6, 15, tzinfo=timezone.utc),
    ))


@pytest.fixture
def svc_agregat(store) -> AgregatLayanan:
    return AgregatLayanan(store)


@pytest.mark.asyncio
async def test_rekonsiliasi_gold(svc_agregat, store, desa_id):
    await _settle(store, desa_id, 200_000, 20_000)
    await _settle(store, desa_id, 150_000, 15_000)
    await svc_agregat.jalankan_gold(None, desa_id)
    total = await svc_agregat.total_metrik(desa_id, "pendapatan", TGL, TGL)
    assert total == 350_000
    kontrib = await svc_agregat.total_metrik(desa_id, "kontribusi", TGL, TGL)
    assert kontrib == 35_000


@pytest.mark.asyncio
async def test_outbox_tepat_sekali(svc_agregat, store, desa_id):
    await _settle(store, desa_id, 200_000, 20_000)
    await svc_agregat.jalankan_gold(None, desa_id)
    await svc_agregat.jalankan_gold(None, desa_id)
    total = await svc_agregat.total_metrik(desa_id, "pendapatan", TGL, TGL)
    assert total == 200_000


@pytest.mark.asyncio
async def test_job_konkuren_ditolak(svc_agregat, desa_id):
    await svc_agregat.mulai_job(Lapisan.gold, desa_id, "gold-1")
    with pytest.raises(JobSedangBerjalan):
        await svc_agregat.mulai_job(Lapisan.gold, desa_id, "gold-2")


@pytest.mark.asyncio
async def test_metrik_tidak_dikenal(svc_agregat, desa_id, konteks_pengelola):
    with pytest.raises(MetrikTidakDikenal):
        await svc_agregat.baca(konteks_pengelola, desa_id, "metrik_ngawur", TGL, TGL)


@pytest.mark.asyncio
async def test_job_tercatat_sukses(svc_agregat, store, desa_id):
    await _settle(store, desa_id, 100_000, 10_000)
    j = await svc_agregat.jalankan_gold(None, desa_id)
    assert j.status == StatusJob.sukses.value
    assert j.baris_masuk == 1
    assert j.baris_keluar == 2

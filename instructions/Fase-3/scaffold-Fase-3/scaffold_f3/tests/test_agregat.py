from datetime import date
from uuid import uuid4

import pytest

from app.enums import JenisPeristiwa, Lapisan, StatusJob
from app.errors import GalatDomain
from app.model import Peristiwa
from app.util import uuid7
from .conftest import TGL


async def _settle(repos, desa_id, jam, bruto, reinvest, penyedia=None):
    penyedia = penyedia or uuid4()
    await repos["peristiwa"].simpan(Peristiwa(
        id=uuid7(), desa_id=desa_id, jenis=JenisPeristiwa.transaksi_settle.value,
        muatan={"penyedia_id": str(penyedia), "bruto": bruto,
                "porsi_reinvestasi": reinvest, "tanggal": TGL.isoformat()},
        terjadi_pada=jam.now()))


async def test_rekonsiliasi_gold(svc, repos, desa_a, jam):
    """Gate 1: agregat gold pendapatan == Σ bruto sumber transaksional."""
    await _settle(repos, desa_a, jam, 200_000, 20_000)
    await _settle(repos, desa_a, jam, 150_000, 15_000)
    await svc["agregat"].proses_outbox_gold(desa_a)
    total = await svc["agregat"].total_metrik(desa_a, "pendapatan", TGL, TGL)
    assert total == 350_000
    kontrib = await svc["agregat"].total_metrik(desa_a, "kontribusi", TGL, TGL)
    assert kontrib == 35_000


async def test_outbox_tepat_sekali(svc, repos, desa_a, jam):
    """Gate 8: run ulang tak menggandakan agregat (kursor idempoten)."""
    await _settle(repos, desa_a, jam, 200_000, 20_000)
    await svc["agregat"].proses_outbox_gold(desa_a)
    await svc["agregat"].proses_outbox_gold(desa_a)  # run kedua: tak ada peristiwa baru
    total = await svc["agregat"].total_metrik(desa_a, "pendapatan", TGL, TGL)
    assert total == 200_000  # bukan 400_000


async def test_job_konkuren_ditolak(svc, desa_a):
    """Gate 12: trigger lapisan yg sedang berjalan → job_sedang_berjalan."""
    await svc["agregat"].mulai_job(Lapisan.gold, desa_a, "gold-1")
    with pytest.raises(GalatDomain) as e:
        await svc["agregat"].mulai_job(Lapisan.gold, desa_a, "gold-2")
    assert e.value.kode == "job_sedang_berjalan"


async def test_metrik_tidak_dikenal(svc, desa_a):
    with pytest.raises(GalatDomain) as e:
        await svc["agregat"].baca_agregat(desa_a, "metrik_ngawur", TGL, TGL)
    assert e.value.kode == "metrik_tidak_dikenal"


async def test_job_tercatat_sukses(svc, repos, desa_a, jam):
    await _settle(repos, desa_a, jam, 100_000, 10_000)
    j = await svc["agregat"].proses_outbox_gold(desa_a)
    assert j.status == StatusJob.sukses and j.baris_masuk == 1 and j.baris_keluar == 2

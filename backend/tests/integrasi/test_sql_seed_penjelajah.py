"""Integrasi seed Penjelajah Kiluan — alur belajar → QR check-in."""
from __future__ import annotations

import os

import pytest

from app.domain.seed_penjelajah import (
    KODE_MISI_AKSI_LUMBA,
    KODE_MISI_BELAJAR_LUMBA,
    QR_DERMAGA,
    isi_penjelajah_desa,
)
from app.layanan.penjelajah import PenjelajahLayanan
from tests.integrasi.f2_bantu import seed_dermaga_e2e

TEST_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="TEST_DATABASE_URL tidak diset")


@pytest.mark.asyncio
async def test_seed_kiluan_misi_daftar(sesi):
    seed = await seed_dermaga_e2e(sesi)
    # Pakai desa e2e-f2; seed konten sama dengan Teluk Kiluan
    await isi_penjelajah_desa(sesi, seed.desa_id)
    await sesi.commit()

    svc = PenjelajahLayanan(seed.store)
    rows = await svc.daftar_misi(seed.desa_id, aktif_only=True)
    kodes = {m.kode for m in rows}
    assert KODE_MISI_BELAJAR_LUMBA in kodes
    assert KODE_MISI_AKSI_LUMBA in kodes
    assert len(rows) >= 6


@pytest.mark.asyncio
async def test_seed_kiluan_belajar_lalu_qr(sesi):
    seed = await seed_dermaga_e2e(sesi)
    ids = await isi_penjelajah_desa(sesi, seed.desa_id)
    await sesi.commit()

    svc = PenjelajahLayanan(seed.store)
    k = seed.wisatawan
    belajar_id = ids[KODE_MISI_BELAJAR_LUMBA]
    aksi_id = ids[KODE_MISI_AKSI_LUMBA]

    await svc.selesaikan_misi(k, seed.desa_id, belajar_id)
    hasil = await svc.selesaikan_misi(
        k,
        seed.desa_id,
        aksi_id,
        bukti={"qr_token": QR_DERMAGA, "lokasi": {"lat": -5.7497, "lng": 105.1985}},
    )
    await sesi.commit()
    assert hasil["stempel"].status == "terverifikasi"

    paspor = await svc.paspor_saya(k, seed.desa_id)
    assert paspor["paspor"].total_stempel == 2

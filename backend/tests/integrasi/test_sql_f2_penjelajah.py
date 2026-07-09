"""Integrasi Penjelajah F2 — PostGIS ST_DWithin + paspor anti-greenwashing."""
from __future__ import annotations

import os
from uuid import uuid4

import pytest

from app.domain import entitas as E
from app.domain.enums import StatusDesa
from app.domain.errors import DiLuarGeofence, KesalahanValidasi, TidakDitemukan
from app.layanan.penjelajah import PenjelajahLayanan
from app.model import tabel as M
from app.repo.f2_sql import _set_lokasi_stasiun
from tests.integrasi.f2_bantu import seed_dermaga_e2e

TEST_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="TEST_DATABASE_URL tidak diset")


async def _seed_penjelajah(sesi, seed):
    qr = "STN-E2E-TEST"
    stasiun_id = uuid4()
    sesi.add(M.StasiunLestari(
        id=stasiun_id, desa_id=seed.desa_id, nama="Dermaga Uji", tipe="dermaga",
        qr_token=qr, radius_m=80, aktif=True,
    ))
    await sesi.flush()
    await _set_lokasi_stasiun(sesi, stasiun_id, -5.7500, 105.1200)

    belajar_id = uuid4()
    sesi.add(M.Misi(
        id=belajar_id, desa_id=seed.desa_id, kode="E2E-BELAJAR", judul="Etik Lumba",
        jenis="belajar", kategori="lumba", poin=10,
        syarat_verifikasi={"metode": "otomatis"},
        dampak_template={"lumba": 1}, aktif=True,
    ))
    aksi_id = uuid4()
    sesi.add(M.Misi(
        id=aksi_id, desa_id=seed.desa_id, kode="E2E-AKSI", judul="Check-in Dermaga",
        jenis="aksi", kategori="lumba", poin=50, stasiun_id=stasiun_id,
        syarat_verifikasi={"metode": "qr_checkin"},
        dampak_template={"lumba": 1}, aktif=True,
    ))
    await sesi.commit()
    return qr, belajar_id, aksi_id


@pytest.mark.asyncio
async def test_geofence_st_dwithin_dalam_radius(sesi):
    seed = await seed_dermaga_e2e(sesi)
    qr, belajar_id, aksi_id = await _seed_penjelajah(sesi, seed)
    svc = PenjelajahLayanan(seed.store)
    k = seed.wisatawan

    await svc.selesaikan_misi(k, seed.desa_id, belajar_id)
    hasil = await svc.selesaikan_misi(
        k, seed.desa_id, aksi_id,
        bukti={"qr_token": qr, "lokasi": {"lat": -5.7501, "lng": 105.1201}},
    )
    await sesi.commit()
    assert hasil["stempel"].status == "terverifikasi"

    data = await svc.paspor_saya(k, seed.desa_id)
    assert data["paspor"].total_stempel == 2


@pytest.mark.asyncio
async def test_geofence_luar_radius_ditolak(sesi):
    seed = await seed_dermaga_e2e(sesi)
    qr, belajar_id, aksi_id = await _seed_penjelajah(sesi, seed)
    svc = PenjelajahLayanan(seed.store)
    k = seed.wisatawan

    await svc.selesaikan_misi(k, seed.desa_id, belajar_id)
    with pytest.raises(DiLuarGeofence):
        await svc.selesaikan_misi(
            k, seed.desa_id, aksi_id,
            bukti={"qr_token": qr, "lokasi": {"lat": -5.80, "lng": 105.1200}},
        )


@pytest.mark.asyncio
async def test_aksi_tanpa_belajar_ditolak(sesi):
    seed = await seed_dermaga_e2e(sesi)
    qr, _, aksi_id = await _seed_penjelajah(sesi, seed)
    svc = PenjelajahLayanan(seed.store)
    k = seed.wisatawan

    with pytest.raises(KesalahanValidasi):
        await svc.selesaikan_misi(
            k, seed.desa_id, aksi_id,
            bukti={"qr_token": qr, "lokasi": {"lat": -5.7501, "lng": 105.1201}},
        )


@pytest.mark.asyncio
async def test_isolasi_tenant_misi(sesi):
    seed = await seed_dermaga_e2e(sesi)
    _, belajar_id, _ = await _seed_penjelajah(sesi, seed)
    svc = PenjelajahLayanan(seed.store)

    lain = await seed.store.desa.tambah(E.Desa(slug="lain-f2", nama="Lain", status=StatusDesa.aktif))
    await sesi.commit()
    with pytest.raises(TidakDitemukan):
        await svc.detail_misi(lain.id, str(belajar_id))

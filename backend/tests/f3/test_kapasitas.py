"""Uji F3 — daya dukung & kapasitas."""
from __future__ import annotations

from datetime import date
from uuid import uuid4

import pytest

from app.domain.errors import DayaDukungTerlampaui, KesalahanValidasi
from app.f3.enums import LevelKapasitas
from app.layanan.kapasitas import KapasitasLayanan
from app.model import tabel as M

TGL = date(2026, 6, 15)


async def _config(svc: KapasitasLayanan, store, desa_id, dest, kap=100, kuning=0.7, merah=0.9):
    await store.daya_dukung.upsert(
        M.DayaDukung(
            id=uuid4(), desa_id=desa_id, destinasi_id=dest,
            kapasitas_harian=kap, ambang_kuning=kuning, ambang_merah=merah,
            metode_hitung="booking+checkin",
        )
    )


@pytest.mark.asyncio
async def test_ambang_level_tepat(store, desa_id):
    svc = KapasitasLayanan(store)
    dest = uuid4()
    await _config(svc, store, desa_id, dest, kap=100, kuning=0.7, merah=0.9)
    hijau = await svc.hitung_snapshot(desa_id, dest, TGL, kunjungan=69)
    assert hijau.level == LevelKapasitas.hijau.value
    kuning = await svc.hitung_snapshot(desa_id, dest, TGL, kunjungan=70)
    assert kuning.level == LevelKapasitas.kuning.value
    merah = await svc.hitung_snapshot(desa_id, dest, TGL, kunjungan=90)
    assert merah.level == LevelKapasitas.merah.value


@pytest.mark.asyncio
async def test_ambang_validasi(store, desa_id, konteks_pengelola):
    svc = KapasitasLayanan(store)
    with pytest.raises(KesalahanValidasi):
        await svc.upsert_daya_dukung(
            konteks_pengelola, desa_id, uuid4(),
            {"kapasitas_harian": 100, "ambang_kuning": 0.9, "ambang_merah": 0.7},
        )


@pytest.mark.asyncio
async def test_projeksi_publik_sembunyikan_kunjungan(store, desa_id):
    svc = KapasitasLayanan(store)
    dest = uuid4()
    await _config(svc, store, desa_id, dest)
    pk = await svc.hitung_snapshot(desa_id, dest, TGL, kunjungan=95)
    from app.api.lestari import _kapasitas_dto
    pub = _kapasitas_dto(pk, publik=True)
    assert "kunjungan" not in pub
    assert pub["level"] == "merah"


@pytest.mark.asyncio
async def test_blokir_booking_saat_merah(store, desa_id):
    svc = KapasitasLayanan(store)
    dest = uuid4()
    await _config(svc, store, desa_id, dest)
    await svc.hitung_snapshot(desa_id, dest, TGL, kunjungan=95)
    with pytest.raises(DayaDukungTerlampaui):
        await svc.cek_blokir_booking(desa_id, dest, TGL, blokir_aktif=True)


@pytest.mark.asyncio
async def test_blokir_mati_tetap_lolos(store, desa_id):
    svc = KapasitasLayanan(store)
    dest = uuid4()
    await _config(svc, store, desa_id, dest)
    await svc.hitung_snapshot(desa_id, dest, TGL, kunjungan=95)
    await svc.cek_blokir_booking(desa_id, dest, TGL, blokir_aktif=False)

from datetime import date
from uuid import uuid4

import pytest

from app.enums import LevelKapasitas
from app.errors import GalatDomain
from .conftest import TGL


async def _config(svc, desa_id, dest, kap=100, kuning=0.7, merah=0.9):
    await svc["kapasitas"].upsert_daya_dukung(
        desa_id, dest, kapasitas_harian=kap, ambang_kuning=kuning, ambang_merah=merah)


async def test_ambang_level_tepat(svc, desa_a):
    """Gate 4: level memicu tepat di ambang kuning/merah (inklusif)."""
    dest = uuid4()
    await _config(svc, desa_a, dest, kap=100, kuning=0.7, merah=0.9)
    hijau = await svc["kapasitas"].hitung(desa_a, dest, TGL, kunjungan=69)
    assert hijau.level == LevelKapasitas.hijau
    kuning = await svc["kapasitas"].hitung(desa_a, dest, TGL, kunjungan=70)  # == ambang
    assert kuning.level == LevelKapasitas.kuning
    merah = await svc["kapasitas"].hitung(desa_a, dest, TGL, kunjungan=90)  # == ambang
    assert merah.level == LevelKapasitas.merah


async def test_ambang_validasi(svc, desa_a):
    with pytest.raises(GalatDomain) as e:
        await svc["kapasitas"].upsert_daya_dukung(
            desa_a, uuid4(), kapasitas_harian=100, ambang_kuning=0.9, ambang_merah=0.7)
    assert e.value.kode == "validasi_gagal"


async def test_projeksi_publik_sembunyikan_kunjungan(svc, desa_a):
    dest = uuid4()
    await _config(svc, desa_a, dest)
    pk = await svc["kapasitas"].hitung(desa_a, dest, TGL, kunjungan=95)
    pub = pk.publik()
    assert "kunjungan" not in pub
    assert pub["level"] == "merah" and "rasio" in pub


async def test_blokir_booking_saat_merah(svc, desa_a):
    """Gate 5: merah + blokir aktif → daya_dukung_terlampaui."""
    dest = uuid4()
    await _config(svc, desa_a, dest)
    await svc["kapasitas"].hitung(desa_a, dest, TGL, kunjungan=95)  # merah
    with pytest.raises(GalatDomain) as e:
        await svc["kapasitas"].cek_blokir_booking(desa_a, dest, TGL, blokir_aktif=True)
    assert e.value.kode == "daya_dukung_terlampaui"


async def test_blokir_mati_tetap_lolos(svc, desa_a):
    """Gate 5: blokir mati (default) → hanya peringatan, tak menolak."""
    dest = uuid4()
    await _config(svc, desa_a, dest)
    await svc["kapasitas"].hitung(desa_a, dest, TGL, kunjungan=95)  # merah
    # tak melempar
    await svc["kapasitas"].cek_blokir_booking(desa_a, dest, TGL, blokir_aktif=False)

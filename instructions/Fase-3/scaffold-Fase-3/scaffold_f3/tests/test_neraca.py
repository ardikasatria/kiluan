from datetime import date
from uuid import uuid4

import pytest

from app.enums import MetodeMonitoring, StatusMonitoring
from app.errors import GalatDomain
from app.model import Stempel
from .conftest import PERIODE, TGL


async def _monitoring_terverifikasi(svc, desa_a, indikator_id, lokasi=(-5.75, 105.12)):
    m = await svc["monitoring"].catat(desa_a, uuid4(), {
        "indikator_id": indikator_id, "nilai": 85, "waktu_ukur": TGL,
        "metode": "survei_lapangan", "lokasi": lokasi})
    await svc["monitoring"].verifikasi_geofence(desa_a, m.id, pusat=lokasi, radius_m=100)
    return m


async def test_hanya_terverifikasi_masuk_skor(svc, desa_a, indikator_mangrove):
    """Gate 6: monitoring menunggu/ditolak tak menaikkan skor_ekologi."""
    # hanya menunggu → skor ekologi 0
    await svc["monitoring"].catat(desa_a, uuid4(), {
        "indikator_id": 1, "nilai": 85, "waktu_ukur": TGL, "metode": "survei_lapangan"})
    n0 = await svc["neraca"].hitung(desa_a, PERIODE)
    assert n0.skor_ekologi == 0.0

    # setelah terverifikasi → naik
    await _monitoring_terverifikasi(svc, desa_a, 1)
    n1 = await svc["neraca"].hitung(desa_a, PERIODE)
    assert n1.skor_ekologi > 0.0


async def test_anti_greenwashing(svc, desa_a, indikator_mangrove):
    """Gate 7: klaim dampak stempel tanpa dukungan monitoring tak menaikkan skor_ekologi."""
    # stempel klaim mangrove TERVERIFIKASI, tapi TANPA monitoring mangrove terverifikasi
    await svc["neraca"].stempel.simpan(Stempel(
        id=uuid4(), desa_id=desa_a, pengguna_id=uuid4(),
        indikator_kode="mangrove_survival", dampak={"mangrove": 5},
        status=StatusMonitoring.terverifikasi))
    n = await svc["neraca"].hitung(desa_a, PERIODE)
    assert n.skor_ekologi == 0.0  # klaim tak didukung → tak dihitung
    assert n.komponen["klaim_dampak_diklaim"] == 5
    assert n.komponen["klaim_dampak_tervalidasi"] == 0

    # tambah monitoring mangrove terverifikasi → klaim tervalidasi
    await _monitoring_terverifikasi(svc, desa_a, 1)
    n2 = await svc["neraca"].hitung(desa_a, PERIODE)
    assert n2.komponen["klaim_dampak_tervalidasi"] == 5
    assert n2.skor_ekologi > 0.0


async def test_periode_terkunci(svc, desa_a, indikator_mangrove):
    """Gate 11: hitung ulang periode terkunci → periode_final."""
    await svc["neraca"].hitung(desa_a, PERIODE)
    await svc["neraca"].kunci(desa_a, PERIODE)
    with pytest.raises(GalatDomain) as e:
        await svc["neraca"].hitung(desa_a, PERIODE)
    assert e.value.kode == "periode_final"


async def test_skor_total_berbobot(svc, desa_a, indikator_mangrove, indikator_karang):
    from app.model import Transaksi
    await _monitoring_terverifikasi(svc, desa_a, 1)
    await _monitoring_terverifikasi(svc, desa_a, 2, lokasi=(-5.76, 105.13))
    await svc["neraca"].transaksi.simpan(Transaksi(
        id=uuid4(), desa_id=desa_a, penyedia_tipe="umkm", penyedia_id=uuid4(),
        bruto=5_000_000, porsi_reinvestasi=500_000, neto_penyedia=4_500_000, tanggal=TGL))
    n = await svc["neraca"].hitung(desa_a, PERIODE)
    # ekologi 2/3, sosial 1/5, ekonomi 0.5 → total = .4*.667 + .3*.2 + .3*.5
    assert round(n.skor_total, 4) == round(0.4 * (2/3) + 0.3 * 0.2 + 0.3 * 0.5, 4)

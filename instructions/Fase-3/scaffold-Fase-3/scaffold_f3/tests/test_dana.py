from datetime import date
from uuid import uuid4

import pytest

from app.errors import GalatDomain
from app.model import Transaksi
from .conftest import TGL


def _trx(desa_id, bruto=200_000, reinvest=20_000):
    return Transaksi(id=uuid4(), desa_id=desa_id, penyedia_tipe="umkm",
                     penyedia_id=uuid4(), bruto=bruto, porsi_reinvestasi=reinvest,
                     neto_penyedia=bruto - reinvest, tanggal=TGL)


async def test_outflow_wajib_bukti(svc, desa_a):
    """Gate 3: keluar tanpa bukti → bukti_media_wajib."""
    with pytest.raises(GalatDomain) as e:
        await svc["dana"].catat(desa_a, uuid4(), {
            "jenis": "keluar", "kategori": "penanaman_mangrove",
            "jumlah": 1_500_000, "tanggal": TGL, "keterangan": "500 bibit"})
    assert e.value.kode == "bukti_media_wajib"


async def test_outflow_dengan_bukti_ok(svc, desa_a):
    e = await svc["dana"].catat(desa_a, uuid4(), {
        "jenis": "keluar", "kategori": "penanaman_mangrove", "jumlah": 1_500_000,
        "tanggal": TGL, "bukti_media_id": uuid4(), "keterangan": "500 bibit"})
    assert e.bukti_media_id is not None


async def test_sumber_transaksi_manual_ditolak(svc, desa_a):
    """Gate 3: sumber_tipe=transaksi lewat endpoint → validasi_gagal."""
    with pytest.raises(GalatDomain) as e:
        await svc["dana"].catat(desa_a, uuid4(), {
            "jenis": "masuk", "sumber_tipe": "transaksi", "jumlah": 50_000, "tanggal": TGL})
    assert e.value.kode == "validasi_gagal"


async def test_inflow_idempoten(svc, desa_a):
    """Gate 2: settle diproses ulang tak menggandakan inflow (UNIQUE sumber_id)."""
    trx = _trx(desa_a, reinvest=20_000)
    await svc["dana"].inflow_dari_transaksi(trx)
    await svc["dana"].inflow_dari_transaksi(trx)  # ulang
    entri = await svc["dana"].dana.daftar(desa_a)
    assert len(entri) == 1
    assert entri[0].jumlah == 20_000


async def test_saldo_masuk_minus_keluar(svc, desa_a):
    """Gate 2: saldo = Σ(masuk) − Σ(keluar); inflow = Σ porsi_reinvestasi."""
    await svc["dana"].inflow_dari_transaksi(_trx(desa_a, reinvest=20_000))
    await svc["dana"].inflow_dari_transaksi(_trx(desa_a, reinvest=30_000))
    await svc["dana"].catat(desa_a, uuid4(), {
        "jenis": "keluar", "kategori": "edukasi", "jumlah": 15_000,
        "tanggal": TGL, "bukti_media_id": uuid4()})
    s = await svc["dana"].saldo(desa_a)
    assert s["total_masuk"] == 50_000  # Σ porsi_reinvestasi
    assert s["total_keluar"] == 15_000
    assert s["saldo"] == 35_000
    assert s["per_kategori"]["edukasi"] == 15_000
    assert s["per_sumber"]["transaksi"] == 50_000

"""Gerbang kontrak F3 — dana konservasi."""
from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest

from app.domain.errors import BuktiMediaWajib, KesalahanValidasi
from app.f3.util import uuid7
from app.inti.idempotensi import toko_idempotensi
from app.model import tabel as M
from .conftest import TGL


def _trx(desa_id, reinvest=20_000):
    return M.Transaksi(
        id=uuid4(), desa_id=desa_id, pesanan_id=uuid4(), pembayaran_id=uuid4(),
        penyedia_tipe="umkm", penyedia_id=uuid4(), jenis="penjualan",
        bruto=Decimal("200000"), fee_platform=Decimal("10000"),
        porsi_reinvestasi=Decimal(str(reinvest)), neto_penyedia=Decimal("170000"),
        status="dirilis",
    )


async def test_outflow_wajib_bukti(svc_dana, konteks_pencatat, desa_id):
    toko_idempotensi._m.clear()
    with pytest.raises(BuktiMediaWajib):
        await svc_dana.catat(konteks_pencatat, desa_id, {
            "jenis": "keluar", "kategori": "penanaman_mangrove",
            "jumlah": 1_500_000, "tanggal": TGL, "keterangan": "500 bibit",
        }, idempotency_key="k1")


async def test_outflow_dengan_bukti_ok(svc_dana, konteks_pencatat, desa_id):
    toko_idempotensi._m.clear()
    e = await svc_dana.catat(konteks_pencatat, desa_id, {
        "jenis": "keluar", "kategori": "penanaman_mangrove", "jumlah": 1_500_000,
        "tanggal": TGL, "bukti_media_id": str(uuid4()), "keterangan": "500 bibit",
    }, idempotency_key="k2")
    assert e.bukti_media_id is not None


async def test_sumber_transaksi_manual_ditolak(svc_dana, konteks_pencatat, desa_id):
    toko_idempotensi._m.clear()
    with pytest.raises(KesalahanValidasi):
        await svc_dana.catat(konteks_pencatat, desa_id, {
            "jenis": "masuk", "sumber_tipe": "transaksi", "jumlah": 50_000, "tanggal": TGL,
        }, idempotency_key="k3")


async def test_inflow_idempoten(svc_dana, desa_id):
    trx = _trx(desa_id, reinvest=20_000)
    await svc_dana.inflow_dari_transaksi(trx)
    await svc_dana.inflow_dari_transaksi(trx)
    entri = await svc_dana.dana.daftar(desa_id)
    assert len(entri) == 1
    assert float(entri[0].jumlah) == 20_000


async def test_saldo_masuk_minus_keluar(svc_dana, konteks_pencatat, desa_id):
    toko_idempotensi._m.clear()
    await svc_dana.inflow_dari_transaksi(_trx(desa_id, reinvest=20_000))
    await svc_dana.inflow_dari_transaksi(_trx(desa_id, reinvest=30_000))
    await svc_dana.catat(konteks_pencatat, desa_id, {
        "jenis": "keluar", "kategori": "edukasi", "jumlah": 15_000,
        "tanggal": TGL, "bukti_media_id": str(uuid4()),
    }, idempotency_key="k4")
    s = await svc_dana.saldo(desa_id)
    assert s["total_masuk"] == 50_000
    assert s["total_keluar"] == 15_000
    assert s["saldo"] == 35_000
    assert s["per_kategori"]["edukasi"] == 15_000
    assert s["per_sumber"]["transaksi"] == 50_000

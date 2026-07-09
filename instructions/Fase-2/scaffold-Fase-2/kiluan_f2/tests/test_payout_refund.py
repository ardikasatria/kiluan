from decimal import Decimal

import pytest

from kiluan_f2 import errors
from kiluan_f2.fabrik import seed


def spec_produk(produk, jumlah=4):
    return {"item": [{"item_tipe": "produk_jasa", "item_id": produk.id, "jumlah": jumlah}],
            "kontak": {}}


async def _bayar(app, d, key="co"):
    pes = await app.dermaga.checkout(d["desa_id"], d["wisatawan"], spec_produk(d["produk"]),
                                     idempotency_key=key)
    pay = await app.dermaga.buat_pembayaran(d["desa_id"], d["wisatawan"], pes.id,
                                            "transfer_manual", idempotency_key="p" + key)
    await app.dermaga.konfirmasi_manual(d["desa_id"], d["bendahara"], pay.id,
                                        idempotency_key="k" + key)
    return pes


async def test_rilis_dan_payout(app):
    d = await seed(app)
    pes = await _bayar(app, d)
    # sebelum selesai, transaksi masih tertahan
    t = (await app.b.transaksi.daftar(d["desa_id"]))[0]
    assert t.status == "tertahan_escrow"
    await app.dermaga.selesaikan_pesanan(d["desa_id"], pes.id)
    assert t.status == "dirilis"

    payout = await app.uang.buat_payout(d["desa_id"], d["bendahara"], "umkm", d["umkm_id"],
                                        d_rek(app, d), idempotency_key="po")
    assert payout.jumlah == Decimal("88000")
    assert t.payout_id == payout.id

    # tak ada dobel payout: transaksi sudah ter-payout
    with pytest.raises(errors.GalatDomain):
        await app.uang.buat_payout(d["desa_id"], d["bendahara"], "umkm", d["umkm_id"],
                                   d_rek(app, d), idempotency_key="po2")


async def test_payout_idempoten(app):
    d = await seed(app)
    pes = await _bayar(app, d)
    await app.dermaga.selesaikan_pesanan(d["desa_id"], pes.id)
    a = await app.uang.buat_payout(d["desa_id"], d["bendahara"], "umkm", d["umkm_id"],
                                   d_rek(app, d), idempotency_key="samakey")
    b = await app.uang.buat_payout(d["desa_id"], d["bendahara"], "umkm", d["umkm_id"],
                                   d_rek(app, d), idempotency_key="samakey")
    assert a is b


async def test_refund_sebelum_payout(app):
    d = await seed(app)
    pes = await _bayar(app, d)
    r = await app.uang.ajukan_refund(d["desa_id"], d["wisatawan"], pes.id, "batal",
                                     idempotency_key="r")
    await app.uang.transisi_refund(d["desa_id"], d["bendahara"], r.id, "setuju")
    await app.uang.transisi_refund(d["desa_id"], d["bendahara"], r.id, "proses")
    txs = await app.b.transaksi.daftar(d["desa_id"])
    jenis = sorted(t.jenis for t in txs)
    assert jenis == ["penjualan", "refund"]
    neg = next(t for t in txs if t.jenis == "refund")
    assert neg.neto_penyedia == Decimal("-88000")
    assert (await app.b.pesanan.ambil(pes.id, d["desa_id"])).status == "refund"


async def test_refund_setelah_selesai_ditolak(app):
    d = await seed(app)
    pes = await _bayar(app, d)
    await app.dermaga.selesaikan_pesanan(d["desa_id"], pes.id)
    r = await app.uang.ajukan_refund(d["desa_id"], d["wisatawan"], pes.id, "telat",
                                     idempotency_key="r")
    await app.uang.transisi_refund(d["desa_id"], d["bendahara"], r.id, "setuju")
    with pytest.raises(errors.GalatDomain) as e:
        await app.uang.transisi_refund(d["desa_id"], d["bendahara"], r.id, "proses")
    assert e.value.kode == "kebijakan_refund"


def d_rek(app, d):
    return d["rek"].id

from decimal import Decimal

import pytest

from kiluan_f2 import errors
from kiluan_f2.fabrik import aktor, seed
from kiluan_f2.enums import POKDARWIS, WISATAWAN


def spec(produk, jumlah=4):
    return {"item": [{"item_tipe": "produk_jasa", "item_id": produk.id, "jumlah": jumlah}],
            "kontak": {}}


async def _checkout(app, d):
    return await app.dermaga.checkout(d["desa_id"], d["wisatawan"], spec(d["produk"]),
                                      idempotency_key="co")


async def test_manual_hanya_bendahara_dan_bukan_pembeli(app):
    d = await seed(app, gateway="manual")
    pes = await _checkout(app, d)
    pay = await app.dermaga.buat_pembayaran(d["desa_id"], d["wisatawan"], pes.id,
                                            "transfer_manual", idempotency_key="p")
    assert pay.status == "menunggu"
    # pembeli yang kebetulan juga pokdarwis tetap tak boleh konfirmasi pesanannya sendiri
    pembeli_pokdarwis = aktor(d["wisatawan"].pengguna_id, WISATAWAN, POKDARWIS)
    with pytest.raises(errors.GalatDomain) as e:
        await app.dermaga.konfirmasi_manual(d["desa_id"], pembeli_pokdarwis, pay.id,
                                             idempotency_key="x")
    assert e.value.http == 403


async def test_split_escrow_invarian(app):
    d = await seed(app, gateway="manual", reinvestasi="0.10", fee="0.02")
    pes = await _checkout(app, d)  # 4 x 25000 = 100000, satu penyedia (umkm)
    pay = await app.dermaga.buat_pembayaran(d["desa_id"], d["wisatawan"], pes.id,
                                            "transfer_manual", idempotency_key="p")
    await app.dermaga.konfirmasi_manual(d["desa_id"], d["bendahara"], pay.id, idempotency_key="k")
    txs = await app.b.transaksi.daftar(d["desa_id"])
    assert len(txs) == 1
    t = txs[0]
    assert t.bruto == Decimal("100000")
    assert t.fee_platform == Decimal("2000")
    assert t.porsi_reinvestasi == Decimal("10000")
    assert t.neto_penyedia == Decimal("88000")
    assert t.bruto == t.fee_platform + t.porsi_reinvestasi + t.neto_penyedia
    assert t.status == "tertahan_escrow"
    assert pay.status == "berhasil"


async def test_redirect_klien_tak_ubah_status(app):
    d = await seed(app, gateway="xendit")
    pes = await _checkout(app, d)
    pay = await app.dermaga.buat_pembayaran(d["desa_id"], d["wisatawan"], pes.id, "qris",
                                            idempotency_key="p")
    assert pay.redirect_url and pay.status == "menunggu"
    # tanpa webhook, status tetap menunggu (klien kembali dari redirect tak berwenang)
    assert (await app.b.pesanan.ambil(pes.id, d["desa_id"])).status == "menunggu_pembayaran"


async def test_webhook_signature_dan_tepat_sekali(app):
    d = await seed(app, gateway="xendit")
    pes = await _checkout(app, d)
    pay = await app.dermaga.buat_pembayaran(d["desa_id"], d["wisatawan"], pes.id, "qris",
                                            idempotency_key="p")
    # signature salah → 401
    with pytest.raises(errors.GalatDomain) as e:
        await app.dermaga.proses_webhook("xendit", {
            "signature": "palsu", "event_id": "ev1", "ref_eksternal": pay.ref_eksternal,
            "jenis_event": "berhasil"})
    assert e.value.kode == "webhook_signature_invalid"

    ev = {"signature": "sig-xnd", "event_id": "ev1", "ref_eksternal": pay.ref_eksternal,
          "jenis_event": "berhasil"}
    await app.dermaga.proses_webhook("xendit", ev)
    r2 = await app.dermaga.proses_webhook("xendit", ev)  # kirim ulang
    assert r2["status"] == "diabaikan"
    # tepat-sekali: hanya satu transaksi meski webhook ganda
    assert len(await app.b.transaksi.daftar(d["desa_id"])) == 1
    assert pay.status == "berhasil"

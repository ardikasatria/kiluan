from decimal import Decimal

import asyncio
import pytest

from app.f2 import errors
from app.f2.fabrik import aktor, seed
from app.f2.enums import WISATAWAN


def spec_produk(produk, jumlah=3, **kw):
    return {"item": [{"item_tipe": "produk_jasa", "item_id": produk.id, "jumlah": jumlah}],
            "kontak": {"nama": "Sinta"}, **kw}


def spec_paket(paket, slot, jumlah=1):
    return {"item": [{"item_tipe": "paket_wisata", "item_id": paket.id,
                      "slot_jadwal_id": slot.id, "jumlah": jumlah,
                      "metadata": {"jumlah_orang": 2}}], "kontak": {}}


async def test_total_dan_snapshot(dunia):
    app, d = dunia["app"], dunia
    pes = await app.dermaga.checkout(d["desa_id"], d["wisatawan"], spec_produk(d["produk"], 3),
                                     idempotency_key="k1")
    assert pes.subtotal == Decimal("75000")
    assert pes.total == pes.subtotal - pes.diskon + pes.ongkir == Decimal("75000")
    # harga di-snapshot: ubah katalog tak mengubah pesanan
    d["produk"].harga = Decimal("999999")
    assert pes.item[0].harga_snapshot == Decimal("25000")


async def test_idempotensi_checkout(dunia):
    app, d = dunia["app"], dunia
    a = await app.dermaga.checkout(d["desa_id"], d["wisatawan"], spec_produk(d["produk"]),
                                   idempotency_key="sama")
    b = await app.dermaga.checkout(d["desa_id"], d["wisatawan"], spec_produk(d["produk"]),
                                   idempotency_key="sama")
    assert a is b  # replay = pesanan sama, tak ganda


async def test_idempotency_key_wajib(dunia):
    app, d = dunia["app"], dunia
    with pytest.raises(errors.GalatDomain) as e:
        await app.dermaga.checkout(d["desa_id"], d["wisatawan"], spec_produk(d["produk"]))
    assert e.value.kode == "idempotency_key_wajib"


async def test_anti_overbook_race(app):
    d = await seed(app, kuota=1)
    w1, w2 = aktor("w1", WISATAWAN), aktor("w2", WISATAWAN)
    hasil = await asyncio.gather(
        app.dermaga.checkout(d["desa_id"], w1, spec_paket(d["paket"], d["slot"]), idempotency_key="a"),
        app.dermaga.checkout(d["desa_id"], w2, spec_paket(d["paket"], d["slot"]), idempotency_key="b"),
        return_exceptions=True,
    )
    sukses = [h for h in hasil if not isinstance(h, Exception)]
    gagal = [h for h in hasil if isinstance(h, errors.GalatDomain)]
    assert len(sukses) == 1 and len(gagal) == 1
    assert gagal[0].kode == "slot_penuh"
    slot = await app.b.slot.ambil(d["slot"].id, d["desa_id"])
    assert slot.kuota_terpakai <= slot.kuota == 1


async def test_hold_kedaluwarsa_lepas_kuota(app):
    d = await seed(app, kuota=1, hold=30)
    await app.dermaga.checkout(d["desa_id"], d["wisatawan"], spec_paket(d["paket"], d["slot"]),
                               idempotency_key="k")
    slot = await app.b.slot.ambil(d["slot"].id, d["desa_id"])
    assert slot.kuota_terpakai == 1 and slot.status == "penuh"
    app.jam.maju(menit=31)
    await app.dermaga.sapu_kedaluwarsa(d["desa_id"])
    assert slot.kuota_terpakai == 0 and slot.status == "buka"


async def test_batal_lepas_kuota(dunia):
    app, d = dunia["app"], dunia
    pes = await app.dermaga.checkout(d["desa_id"], d["wisatawan"], spec_paket(d["paket"], d["slot"]),
                                     idempotency_key="k")
    await app.dermaga.batalkan(d["desa_id"], d["wisatawan"], pes.id)
    slot = await app.b.slot.ambil(d["slot"].id, d["desa_id"])
    assert slot.kuota_terpakai == 0
    assert pes.status == "dibatalkan"

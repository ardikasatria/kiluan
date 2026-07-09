from decimal import Decimal

import pytest

from kiluan_f2 import errors
from kiluan_f2.clock import id_baru
from kiluan_f2.fabrik import aktor, seed
from kiluan_f2.enums import WISATAWAN
from kiluan_f2.models import SlotJadwal


async def test_itinerary_hormati_kuota(app):
    d = await seed(app)
    # slot seed default buka; tambahkan satu slot penuh yang harus dilewati
    penuh = SlotJadwal(id_baru(), d["desa_id"], "paket_wisata", d["paket"].id, "2026-07-13",
                       kuota=1, kuota_terpakai=1, harga_override=Decimal("300000"), status="penuh")
    await app.b.slot.simpan(penuh)
    sesi = await app.pemandu.itinerary(d["desa_id"], d["wisatawan"],
                                       {"minat": ["lumba"], "budget": 1000000})
    ids = {r["slot_id"] for r in sesi.keluaran["itinerary"]}
    assert d["slot"].id in ids and penuh.id not in ids
    assert sesi.model_dipakai == "rule"


async def test_estimasi(app):
    d = await seed(app)
    sesi = await app.pemandu.estimasi(d["desa_id"], d["wisatawan"], [
        {"item_tipe": "produk_jasa", "item_id": d["produk"].id, "jumlah": 2},
        {"item_tipe": "paket_wisata", "item_id": d["paket"].id, "jumlah": 1},
    ])
    assert sesi.keluaran["total"] == Decimal("50000") + Decimal("300000")


async def test_sesi_orang_lain_404(app):
    d = await seed(app)
    sesi = await app.pemandu.itinerary(d["desa_id"], d["wisatawan"], {"budget": 100})
    lain = aktor("w-lain", WISATAWAN)
    with pytest.raises(errors.GalatDomain) as e:
        await app.pemandu.ambil_sesi(d["desa_id"], lain, sesi.id)
    assert e.value.http == 404


async def test_isolasi_tenant_pesanan(app):
    a = await seed(app, desa_id="desa-a")
    b = await seed(app, desa_id="desa-b")
    pes = await app.dermaga.checkout(
        "desa-a", a["wisatawan"],
        {"item": [{"item_tipe": "produk_jasa", "item_id": a["produk"].id, "jumlah": 1}],
         "kontak": {}}, idempotency_key="k")
    # pesanan desa-a tak terlihat dari desa-b
    assert await app.b.pesanan.ambil(pes.id, "desa-b") is None
    with pytest.raises(errors.GalatDomain) as e:
        await app.b.pesanan.wajib(pes.id, "desa-b")
    assert e.value.http == 404


async def test_checkout_referensi_lintas_desa_404(app):
    a = await seed(app, desa_id="desa-a")
    b = await seed(app, desa_id="desa-b")
    # checkout di desa-a menunjuk produk milik desa-b → tidak_ditemukan
    with pytest.raises(errors.GalatDomain) as e:
        await app.dermaga.checkout(
            "desa-a", a["wisatawan"],
            {"item": [{"item_tipe": "produk_jasa", "item_id": b["produk"].id, "jumlah": 1}],
             "kontak": {}}, idempotency_key="k")
    assert e.value.http == 404

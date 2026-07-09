from datetime import timedelta
from decimal import Decimal

import pytest

from kiluan_f2 import errors
from kiluan_f2.clock import id_baru
from kiluan_f2.fabrik import beri_poin, seed
from kiluan_f2.models import KatalogHadiah, Kupon

PENYEDIA = {"umkm:umkm-bahari"}


async def _hadiah(app, desa_id, biaya=100, jenis="merchandise", syarat=None, stok=None):
    h = KatalogHadiah(id_baru(), "Kaos Lumba", jenis, biaya, desa_id=desa_id,
                      syarat=syarat or {}, stok=stok)
    await app.b.hadiah.simpan(h)
    return h


async def test_tukar_saldo_kurang(app):
    d = await seed(app)
    h = await _hadiah(app, d["desa_id"], biaya=100)
    with pytest.raises(errors.GalatDomain) as e:
        await app.poin.tukar(d["desa_id"], d["wisatawan"], h.id, idempotency_key="t")
    assert e.value.kode == "saldo_poin_kurang"


async def test_tukar_sukses_dan_idempoten(app):
    d = await seed(app)
    await beri_poin(app, d["desa_id"], d["wisatawan"].pengguna_id, 200)
    h = await _hadiah(app, d["desa_id"], biaya=100)
    a = await app.poin.tukar(d["desa_id"], d["wisatawan"], h.id, idempotency_key="t")
    assert a["penukaran"].poin_dipakai == 100
    assert await app.poin.saldo(d["desa_id"], d["wisatawan"].pengguna_id) == 100
    b = await app.poin.tukar(d["desa_id"], d["wisatawan"], h.id, idempotency_key="t")
    assert a is b  # replay tak menggandakan
    assert await app.poin.saldo(d["desa_id"], d["wisatawan"].pengguna_id) == 100


async def test_tukar_syarat_tingkat(app):
    d = await seed(app)
    await beri_poin(app, d["desa_id"], d["wisatawan"].pengguna_id, 500)
    h = await _hadiah(app, d["desa_id"], biaya=100, syarat={"tingkat_min": "bahari"})
    with pytest.raises(errors.GalatDomain):
        await app.poin.tukar(d["desa_id"], d["wisatawan"], h.id, idempotency_key="t1")
    app.b.sertifikasi[(d["desa_id"], d["wisatawan"].pengguna_id)] = "lumba_lumba"
    ok = await app.poin.tukar(d["desa_id"], d["wisatawan"], h.id, idempotency_key="t2")
    assert ok["penukaran"].status == "berhasil"


async def _buat_kupon(app, desa_id, **kw):
    k = Kupon(id_baru(), desa_id, kw.get("kode", "PROMO"), "kampanye",
              kw.get("tipe", "nominal"), Decimal(str(kw.get("nilai", 25000))),
              batas_pakai=kw.get("batas", 5), dibuat_pada=app.jam.now(),
              min_belanja=kw.get("min"), penyedia_terbatas=kw.get("penyedia"),
              berlaku_sampai=kw.get("sampai"))
    k.terpakai = kw.get("terpakai", 0)
    await app.b.kupon.simpan(k)
    return k


async def test_kupon_kedaluwarsa(app):
    d = await seed(app)
    k = await _buat_kupon(app, d["desa_id"], sampai=app.jam.now() - timedelta(days=1))
    with pytest.raises(errors.GalatDomain) as e:
        await app.dermaga.kupon.cek(d["desa_id"], k.kode, Decimal("75000"), PENYEDIA)
    assert e.value.kode == "kupon_tidak_berlaku"


async def test_kupon_min_belanja(app):
    d = await seed(app)
    k = await _buat_kupon(app, d["desa_id"], min=Decimal("999999"))
    with pytest.raises(errors.GalatDomain):
        await app.dermaga.kupon.cek(d["desa_id"], k.kode, Decimal("75000"), PENYEDIA)


async def test_kupon_penyedia_di_luar_cakupan(app):
    d = await seed(app)
    k = await _buat_kupon(app, d["desa_id"], penyedia=["umkm:lain"])
    spec = {"item": [{"item_tipe": "produk_jasa", "item_id": d["produk"].id, "jumlah": 3}],
            "kupon_id": k.id, "kontak": {}}
    with pytest.raises(errors.GalatDomain) as e:
        await app.dermaga.checkout(d["desa_id"], d["wisatawan"], spec, idempotency_key="c")
    assert e.value.kode == "kupon_tidak_berlaku"


async def test_kupon_limit_dan_reuse(app):
    d = await seed(app)
    k = await _buat_kupon(app, d["desa_id"], batas=1)
    spec = {"item": [{"item_tipe": "produk_jasa", "item_id": d["produk"].id, "jumlah": 3}],
            "kupon_id": k.id, "kontak": {}}
    pes = await app.dermaga.checkout(d["desa_id"], d["wisatawan"], spec, idempotency_key="c1")
    assert pes.diskon == Decimal("25000") and k.terpakai == 1 and k.status == "habis"
    with pytest.raises(errors.GalatDomain) as e:
        await app.dermaga.checkout(d["desa_id"], d["wisatawan"], spec, idempotency_key="c2")
    assert e.value.kode == "kupon_tidak_berlaku"


async def test_unik_kupon_pesanan(app):
    d = await seed(app)
    k = await _buat_kupon(app, d["desa_id"], batas=5)
    # terapkan dua kali pada pesanan_id yang sama → konflik UNIQUE(kupon,pesanan)
    await app.dermaga.kupon.terapkan(k, "pes-X", "w-1", Decimal("75000"), PENYEDIA)
    with pytest.raises(errors.GalatDomain) as e:
        await app.dermaga.kupon.terapkan(k, "pes-X", "w-1", Decimal("75000"), PENYEDIA)
    assert e.value.http == 409

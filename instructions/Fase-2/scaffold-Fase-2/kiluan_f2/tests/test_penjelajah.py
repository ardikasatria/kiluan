import pytest

from kiluan_f2 import errors
from kiluan_f2.clock import id_baru
from kiluan_f2.fabrik import aktor, seed
from kiluan_f2.enums import AGEN
from kiluan_f2.models import Misi, StasiunLestari


async def _stasiun(app, desa_id, lat=-5.750, lng=105.120, radius=50):
    s = StasiunLestari(id_baru(), desa_id, "Dermaga Lumba", "dermaga",
                       "STN-abc123", lat, lng, radius_m=radius)
    await app.b.stasiun.simpan(s)
    return s


async def _misi(app, desa_id, metode="qr_checkin", stasiun_id=None, foto=False, jenis="aksi"):
    m = Misi(id_baru(), desa_id, "M-" + id_baru("")[-4:], "Tanam Mangrove", jenis, "mangrove",
             poin=50, syarat_verifikasi={"metode": metode, "bukti": {"foto": foto}},
             stasiun_id=stasiun_id, dampak_template={"mangrove": 5})
    await app.b.misi.simpan(m)
    return m


async def test_belajar_otomatis_bump_paspor(app):
    d = await seed(app)
    m = await _misi(app, d["desa_id"], metode="otomatis", jenis="belajar")
    r = await app.penjelajah.selesaikan_misi(d["desa_id"], d["wisatawan"], m.id)
    assert r["stempel"].status == "terverifikasi"
    paspor = await app.penjelajah._paspor(d["desa_id"], d["wisatawan"].pengguna_id)
    assert paspor.total_stempel == 1 and paspor.ringkasan_dampak["mangrove"] == 5


async def test_qr_dalam_radius_valid(app):
    d = await seed(app)
    s = await _stasiun(app, d["desa_id"])
    m = await _misi(app, d["desa_id"], "qr_checkin", s.id)
    bukti = {"qr_token": s.qr_token, "lokasi": {"lat": s.lat + 0.0001, "lng": s.lng}}
    r = await app.penjelajah.selesaikan_misi(d["desa_id"], d["wisatawan"], m.id, bukti=bukti)
    assert r["stempel"].status == "terverifikasi"


async def test_qr_di_luar_geofence(app):
    d = await seed(app)
    s = await _stasiun(app, d["desa_id"], radius=50)
    m = await _misi(app, d["desa_id"], "qr_checkin", s.id)
    bukti = {"qr_token": s.qr_token, "lokasi": {"lat": s.lat + 0.05, "lng": s.lng}}  # ~5 km
    with pytest.raises(errors.GalatDomain) as e:
        await app.penjelajah.selesaikan_misi(d["desa_id"], d["wisatawan"], m.id, bukti=bukti)
    assert e.value.kode == "di_luar_geofence"


async def test_bukti_foto_wajib(app):
    d = await seed(app)
    m = await _misi(app, d["desa_id"], metode="foto_geotag", foto=True)
    with pytest.raises(errors.GalatDomain) as e:
        await app.penjelajah.selesaikan_misi(d["desa_id"], d["wisatawan"], m.id, bukti={})
    assert e.value.kode == "bukti_kurang"


async def test_konfirmasi_pemandu_flow(app):
    d = await seed(app)
    m = await _misi(app, d["desa_id"], metode="konfirmasi_pemandu")
    r = await app.penjelajah.selesaikan_misi(d["desa_id"], d["wisatawan"], m.id)
    assert r["stempel"].status == "menunggu_verifikasi"
    paspor = await app.penjelajah._paspor(d["desa_id"], d["wisatawan"].pengguna_id)
    assert paspor.total_stempel == 0  # belum terverifikasi → belum masuk paspor

    pemandu = aktor("g-1", AGEN)
    await app.penjelajah.putuskan_verifikasi(d["desa_id"], pemandu, r["verifikasi"].id, "valid")
    assert r["stempel"].status == "terverifikasi"
    assert (await app.penjelajah._paspor(d["desa_id"], d["wisatawan"].pengguna_id)).total_stempel == 1


async def test_verifikasi_invalid_tak_bump(app):
    d = await seed(app)
    m = await _misi(app, d["desa_id"], metode="konfirmasi_pemandu")
    r = await app.penjelajah.selesaikan_misi(d["desa_id"], d["wisatawan"], m.id)
    pemandu = aktor("g-1", AGEN)
    await app.penjelajah.putuskan_verifikasi(d["desa_id"], pemandu, r["verifikasi"].id, "invalid")
    assert r["stempel"].status == "ditolak"
    assert (await app.penjelajah._paspor(d["desa_id"], d["wisatawan"].pengguna_id)).total_stempel == 0

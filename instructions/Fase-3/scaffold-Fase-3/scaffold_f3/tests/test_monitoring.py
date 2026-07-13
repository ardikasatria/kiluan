from datetime import date
from uuid import uuid4

import pytest

from app.enums import JenisPeristiwa, MetodeMonitoring, StatusMonitoring
from app.errors import GalatDomain
from app.util import uuid7
from .conftest import TGL


async def test_catat_indikator_tidak_aktif(svc, desa_a):
    with pytest.raises(GalatDomain) as e:
        await svc["monitoring"].catat(desa_a, uuid4(), {
            "indikator_id": 999, "nilai": 80, "waktu_ukur": TGL,
            "metode": "survei_lapangan"})
    assert e.value.kode == "indikator_tidak_aktif"


async def test_pihak_ketiga_wajib_bukti(svc, desa_a, indikator_mangrove):
    with pytest.raises(GalatDomain) as e:
        await svc["monitoring"].catat(desa_a, uuid4(), {
            "indikator_id": 1, "nilai": 80, "waktu_ukur": TGL,
            "metode": "pihak_ketiga"})
    assert e.value.kode == "bukti_media_wajib"


async def test_catat_membuat_verifikasi_menunggu(svc, desa_a, indikator_mangrove):
    m = await svc["monitoring"].catat(desa_a, uuid4(), {
        "indikator_id": 1, "nilai": 82.5, "waktu_ukur": TGL, "metode": "survei_lapangan"})
    assert m.status == StatusMonitoring.menunggu_verifikasi
    v = await svc["monitoring"]._verifikasi_untuk(desa_a, m.id)
    assert v is not None and v.entitas_tipe == "monitoring_ekologi"


async def test_sync_idempoten(svc, desa_a, indikator_mangrove):
    """Gate 10: record id sama di-replay → satu baris (duplikat), bukan galat."""
    rid = uuid7()
    rec = {"id": rid, "indikator_id": 1, "nilai": 80, "waktu_ukur": TGL,
           "metode": "survei_lapangan"}
    h1 = await svc["monitoring"].sync(desa_a, uuid4(), [rec])
    h2 = await svc["monitoring"].sync(desa_a, uuid4(), [rec])  # replay
    assert h1[0].status == "tersimpan"
    assert h2[0].status == "duplikat"
    semua = await svc["monitoring"].monitoring.daftar(desa_a)
    assert len(semua) == 1


async def test_sync_sukses_parsial(svc, desa_a, indikator_mangrove):
    baik = {"id": uuid7(), "indikator_id": 1, "nilai": 80, "waktu_ukur": TGL, "metode": "survei_lapangan"}
    buruk = {"id": uuid7(), "indikator_id": 404, "nilai": 1, "waktu_ukur": TGL, "metode": "survei_lapangan"}
    hasil = await svc["monitoring"].sync(desa_a, uuid4(), [baik, buruk])
    st = {h.status for h in hasil}
    assert st == {"tersimpan", "ditolak"}
    assert next(h for h in hasil if h.status == "ditolak").galat == "indikator_tidak_aktif"


async def test_verifikasi_geofence_luar(svc, desa_a, indikator_mangrove):
    """Gate 9: di luar radius → di_luar_geofence."""
    m = await svc["monitoring"].catat(desa_a, uuid4(), {
        "indikator_id": 1, "nilai": 80, "waktu_ukur": TGL, "metode": "survei_lapangan",
        "lokasi": (-5.7500, 105.1200)})
    with pytest.raises(GalatDomain) as e:
        await svc["monitoring"].verifikasi_geofence(
            desa_a, m.id, pusat=(-5.8000, 105.2000), radius_m=100)
    assert e.value.kode == "di_luar_geofence"


async def test_verifikasi_geofence_dalam_lolos_dan_emit(svc, desa_a, indikator_mangrove, repos):
    m = await svc["monitoring"].catat(desa_a, uuid4(), {
        "indikator_id": 1, "nilai": 80, "waktu_ukur": TGL, "metode": "survei_lapangan",
        "lokasi": (-5.7500, 105.1200)})
    hasil = await svc["monitoring"].verifikasi_geofence(
        desa_a, m.id, pusat=(-5.7500, 105.1201), radius_m=100)
    assert hasil.status == StatusMonitoring.terverifikasi
    ev = await repos["peristiwa"].daftar(desa_a)
    assert any(p.jenis == JenisPeristiwa.monitoring_terverifikasi.value for p in ev)


async def test_verifikasi_bukti_kurang(svc, desa_a, indikator_mangrove):
    m = await svc["monitoring"].catat(desa_a, uuid4(), {
        "indikator_id": 1, "nilai": 80, "waktu_ukur": TGL, "metode": "survei_lapangan",
        "lokasi": (-5.75, 105.12)})
    with pytest.raises(GalatDomain) as e:
        await svc["monitoring"].verifikasi_geofence(
            desa_a, m.id, pusat=(-5.75, 105.12), radius_m=100, wajib_bukti=True)
    assert e.value.kode == "bukti_kurang"


async def test_verifikasi_manual_tolak(svc, desa_a, indikator_mangrove):
    m = await svc["monitoring"].catat(desa_a, uuid4(), {
        "indikator_id": 1, "nilai": 80, "waktu_ukur": TGL, "metode": "laporan_warga"})
    v = await svc["monitoring"]._verifikasi_untuk(desa_a, m.id)
    hasil = await svc["monitoring"].putuskan(desa_a, v.id, valid=False, verifikator_id=uuid4())
    assert hasil.status == StatusMonitoring.ditolak

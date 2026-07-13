"""Gerbang kontrak F3 — monitoring."""
from uuid import uuid4

import pytest

from app.domain.errors import BuktiMediaWajib, DiLuarGeofence, IndikatorTidakAktif
from app.f3.enums import JenisPeristiwaAnalitik
from app.f3.util import uuid7
from .conftest import TGL


async def test_catat_indikator_tidak_aktif(svc_mon, konteks_pencatat, desa_id):
    with pytest.raises(IndikatorTidakAktif):
        await svc_mon.catat(konteks_pencatat, desa_id, {
            "indikator_id": 999, "nilai": 80, "waktu_ukur": TGL, "metode": "survei_lapangan",
        })


async def test_pihak_ketiga_wajib_bukti(svc_mon, konteks_pencatat, desa_id, indikator_mangrove):
    with pytest.raises(BuktiMediaWajib):
        await svc_mon.catat(konteks_pencatat, desa_id, {
            "indikator_id": indikator_mangrove.id, "nilai": 80, "waktu_ukur": TGL,
            "metode": "pihak_ketiga",
        })


async def test_catat_membuat_verifikasi_menunggu(svc_mon, konteks_pencatat, desa_id, indikator_mangrove):
    hasil = await svc_mon.catat(konteks_pencatat, desa_id, {
        "indikator_id": indikator_mangrove.id, "nilai": 82.5, "waktu_ukur": TGL,
        "metode": "survei_lapangan",
    })
    assert hasil["monitoring"].status == "menunggu_verifikasi"
    v = await svc_mon._verifikasi_untuk(desa_id, hasil["monitoring"].id)
    assert v is not None and v.entitas_tipe == "monitoring_ekologi"


async def test_sync_idempoten(svc_mon, konteks_pencatat, desa_id, indikator_mangrove):
    rid = uuid7()
    rec = {"id": str(rid), "indikator_id": indikator_mangrove.id, "nilai": 80,
           "waktu_ukur": TGL, "metode": "survei_lapangan"}
    h1 = await svc_mon.sync(konteks_pencatat, desa_id, [rec])
    h2 = await svc_mon.sync(konteks_pencatat, desa_id, [rec])
    assert h1[0].status == "tersimpan"
    assert h2[0].status == "duplikat"
    semua = await svc_mon.monitoring.daftar(desa_id)
    assert len(semua) == 1


async def test_sync_sukses_parsial(svc_mon, konteks_pencatat, desa_id, indikator_mangrove):
    baik = {"id": str(uuid7()), "indikator_id": indikator_mangrove.id, "nilai": 80,
            "waktu_ukur": TGL, "metode": "survei_lapangan"}
    buruk = {"id": str(uuid7()), "indikator_id": 404, "nilai": 1,
             "waktu_ukur": TGL, "metode": "survei_lapangan"}
    hasil = await svc_mon.sync(konteks_pencatat, desa_id, [baik, buruk])
    st = {h.status for h in hasil}
    assert st == {"tersimpan", "ditolak"}
    assert next(h for h in hasil if h.status == "ditolak").galat == "indikator_tidak_aktif"


async def test_putuskan_valid_emit_peristiwa(svc_mon, konteks_pencatat, desa_id, indikator_mangrove, store):
    hasil = await svc_mon.catat(konteks_pencatat, desa_id, {
        "indikator_id": indikator_mangrove.id, "nilai": 80, "waktu_ukur": TGL,
        "metode": "laporan_warga",
    })
    v = hasil["verifikasi"]
    m = await svc_mon.putuskan_verifikasi(konteks_pencatat, desa_id, v.id, "valid")
    assert m.status == "terverifikasi"
    ev = await store.peristiwa.cari(desa_id=desa_id, jenis=JenisPeristiwaAnalitik.monitoring_terverifikasi.value)
    assert len(ev) == 1

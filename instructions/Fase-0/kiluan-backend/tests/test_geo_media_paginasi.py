"""Gerbang geo, media/lampiran, dan paginasi keyset."""
import pytest

from app.domain.enums import EntitasLampiran, KodePeran, StatusKonten, TipeMedia
from app.domain.errors import KesalahanValidasi
from app.domain.konteks import Konteks
from app.skema.destinasi import DestinasiBuat
from conftest import beri_peran, buat_pengguna, konteks_untuk


def _pengelola(store, desa):
    p = buat_pengguna(store)
    beri_peran(store, p.id, KodePeran.pokdarwis, desa_id=desa.id)
    return konteks_untuk(store, p.id)


# --- GEO ---

def test_cari_radius_dan_jarak(store, desa, svc_destinasi):
    k = _pengelola(store, desa)
    # dekat pusat (-5.79, 105.10)
    svc_destinasi.buat(store and k, desa.id, DestinasiBuat(
        nama="Dekat", slug="dekat", kategori_id=1, lokasi={"lat": -5.791, "lng": 105.104},
        status=StatusKonten.publikasi))
    # jauh (>50 km)
    svc_destinasi.buat(k, desa.id, DestinasiBuat(
        nama="Jauh", slug="jauh", kategori_id=1, lokasi={"lat": -6.3, "lng": 105.6},
        status=StatusKonten.publikasi))

    hasil = svc_destinasi.cari(Konteks(), desa.id, dekat=(-5.79, 105.10), radius_m=5000)
    nama = [i["destinasi"].nama for i in hasil["item"]]
    assert nama == ["Dekat"]                       # hanya yang dalam radius
    assert hasil["item"][0]["jarak_m"] is not None  # jarak disertakan


def test_cari_dekat_terurut_jarak(store, desa, svc_destinasi):
    k = _pengelola(store, desa)
    svc_destinasi.buat(k, desa.id, DestinasiBuat(nama="B", slug="b", kategori_id=1,
        lokasi={"lat": -5.795, "lng": 105.10}, status=StatusKonten.publikasi))
    svc_destinasi.buat(k, desa.id, DestinasiBuat(nama="A", slug="a", kategori_id=1,
        lokasi={"lat": -5.7905, "lng": 105.10}, status=StatusKonten.publikasi))
    hasil = svc_destinasi.cari(Konteks(), desa.id, dekat=(-5.79, 105.10), radius_m=100000)
    jaraks = [i["jarak_m"] for i in hasil["item"]]
    assert jaraks == sorted(jaraks)


# --- MEDIA & LAMPIRAN ---

def test_konfirmasi_tanpa_objek_ditolak(store, desa, svc_media):
    k = _pengelola(store, desa)
    pr = svc_media.presign(k, desa.id, "foto.jpg", "image/jpeg", 12345)
    with pytest.raises(KesalahanValidasi):
        svc_media.konfirmasi(k, desa.id, pr["media_id"], TipeMedia.foto)


def test_presign_konfirmasi_sukses(store, desa, svc_media):
    k = _pengelola(store, desa)
    pr = svc_media.presign(k, desa.id, "foto.jpg", "image/jpeg", 12345)
    store.objek.taruh(pr["objek_minio"])  # simulasi PUT klien ke MinIO
    m = svc_media.konfirmasi(k, desa.id, pr["media_id"], TipeMedia.foto, alt="Gigi Hiu")
    assert m.dikonfirmasi and m.url and m.alt == "Gigi Hiu"


def test_utama_tunggal_per_entitas(store, desa, svc_media):
    import uuid
    k = _pengelola(store, desa)
    entitas_id = uuid.uuid4()
    mids = []
    for i in range(2):
        pr = svc_media.presign(k, desa.id, f"f{i}.jpg", "image/jpeg", 100)
        store.objek.taruh(pr["objek_minio"])
        svc_media.konfirmasi(k, desa.id, pr["media_id"], TipeMedia.foto)
        mids.append(pr["media_id"])
    svc_media.tempel(k, desa.id, mids[0], EntitasLampiran.destinasi, entitas_id, utama=True)
    svc_media.tempel(k, desa.id, mids[1], EntitasLampiran.destinasi, entitas_id, utama=True)
    lampiran = store.lampiran.daftar_entitas(EntitasLampiran.destinasi, entitas_id)
    utama = [l for l in lampiran if l.utama]
    assert len(utama) == 1 and utama[0].media_id == mids[1]


# --- PAGINASI ---

def test_keyset_stabil_saat_data_ditambah(store, desa, svc_destinasi):
    k = _pengelola(store, desa)
    for i in range(5):
        svc_destinasi.buat(k, desa.id, DestinasiBuat(
            nama=f"D{i}", slug=f"d{i}", kategori_id=1,
            lokasi={"lat": -5.79, "lng": 105.10}, status=StatusKonten.publikasi))

    hal1 = svc_destinasi.cari(Konteks(), desa.id, batas=2)
    id_hal1 = [i["destinasi"].id for i in hal1["item"]]
    assert len(id_hal1) == 2 and hal1["meta"]["ada_lagi"]

    # sisipkan baris baru (terbaru) di tengah iterasi
    svc_destinasi.buat(k, desa.id, DestinasiBuat(
        nama="Dbaru", slug="dbaru", kategori_id=1,
        lokasi={"lat": -5.79, "lng": 105.10}, status=StatusKonten.publikasi))

    hal2 = svc_destinasi.cari(Konteks(), desa.id, batas=2, kursor=hal1["meta"]["kursor_berikutnya"])
    id_hal2 = [i["destinasi"].id for i in hal2["item"]]
    # tak ada duplikat antar halaman & baris baru tak menggeser jendela lama
    assert set(id_hal1).isdisjoint(id_hal2)

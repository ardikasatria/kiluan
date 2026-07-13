"""Gerbang geo, media/lampiran, paginasi keyset (async)."""
import uuid

import pytest

from app.domain.enums import EntitasLampiran, KodePeran, StatusKonten, TipeMedia
from app.domain.errors import KesalahanValidasi
from app.domain.konteks import Konteks
from app.layanan.media import MediaLayanan
from app.skema.destinasi import DestinasiBuat
from conftest import beri_peran, buat_pengguna, konteks_untuk


async def _pengelola(store, desa):
    p = await buat_pengguna(store)
    await beri_peran(store, p.id, KodePeran.kontributor, desa_id=desa.id)
    return await konteks_untuk(store, p.id)


def _d(nama, slug, lat, lng):
    return DestinasiBuat(nama=nama, slug=slug, kategori_id=1,
                         lokasi={"lat": lat, "lng": lng}, status=StatusKonten.publikasi)


# --- GEO ---

async def test_cari_radius_dan_jarak(store, desa, svc_destinasi):
    k = await _pengelola(store, desa)
    await svc_destinasi.buat(k, desa.id, _d("Dekat", "dekat", -5.791, 105.104))
    await svc_destinasi.buat(k, desa.id, _d("Jauh", "jauh", -6.3, 105.6))
    hasil = await svc_destinasi.cari(Konteks(), desa.id, dekat=(-5.79, 105.10), radius_m=5000)
    nama = [i["destinasi"].nama for i in hasil["item"]]
    assert nama == ["Dekat"]
    assert hasil["item"][0]["jarak_m"] is not None


async def test_cari_dekat_terurut_jarak(store, desa, svc_destinasi):
    k = await _pengelola(store, desa)
    await svc_destinasi.buat(k, desa.id, _d("B", "b", -5.795, 105.10))
    await svc_destinasi.buat(k, desa.id, _d("A", "a", -5.7905, 105.10))
    hasil = await svc_destinasi.cari(Konteks(), desa.id, dekat=(-5.79, 105.10), radius_m=100000)
    jaraks = [i["jarak_m"] for i in hasil["item"]]
    assert jaraks == sorted(jaraks)


# --- MEDIA & LAMPIRAN ---

async def test_konfirmasi_tanpa_objek_ditolak(store, desa, svc_media):
    k = await _pengelola(store, desa)
    pr = await svc_media.presign(k, desa.id, "foto.jpg", "image/jpeg", 12345)
    with pytest.raises(KesalahanValidasi):
        await svc_media.konfirmasi(k, desa.id, pr["media_id"], TipeMedia.foto)


async def test_presign_konfirmasi_sukses(store, desa, svc_media):
    k = await _pengelola(store, desa)
    pr = await svc_media.presign(k, desa.id, "foto.jpg", "image/jpeg", 12345)
    await store.objek.taruh(pr["objek_minio"])
    m = await svc_media.konfirmasi(k, desa.id, pr["media_id"], TipeMedia.foto, alt="Gigi Hiu")
    assert m.dikonfirmasi and m.url and m.alt == "Gigi Hiu"


async def test_utama_tunggal_per_entitas(store, desa, svc_media):
    k = await _pengelola(store, desa)
    entitas_id = uuid.uuid4()
    mids = []
    for i in range(2):
        pr = await svc_media.presign(k, desa.id, f"f{i}.jpg", "image/jpeg", 100)
        await store.objek.taruh(pr["objek_minio"])
        await svc_media.konfirmasi(k, desa.id, pr["media_id"], TipeMedia.foto)
        mids.append(pr["media_id"])
    await svc_media.tempel(k, desa.id, mids[0], EntitasLampiran.destinasi, entitas_id, utama=True)
    await svc_media.tempel(k, desa.id, mids[1], EntitasLampiran.destinasi, entitas_id, utama=True)
    lampiran = await store.lampiran.daftar_entitas(EntitasLampiran.destinasi, entitas_id)
    utama = [l for l in lampiran if l.utama]
    assert len(utama) == 1 and utama[0].media_id == mids[1]


async def test_media_publik_destinasi(store, desa, svc_destinasi, svc_media):
    k = await _pengelola(store, desa)
    d = await svc_destinasi.buat(k, desa.id, _d("Galeri", "galeri", -5.79, 105.10))
    pr = await svc_media.presign(k, desa.id, "pantai.jpg", "image/jpeg", 2048)
    await store.objek.taruh(pr["objek_minio"])
    await svc_media.konfirmasi(k, desa.id, pr["media_id"], TipeMedia.foto, alt="Pantai")
    await svc_media.tempel(k, desa.id, pr["media_id"], EntitasLampiran.destinasi, d.id, utama=True)
    media = await MediaLayanan(store).daftar_entitas_publik(EntitasLampiran.destinasi, d.id)
    assert len(media) == 1
    assert media[0]["utama"] is True and media[0]["alt"] == "Pantai" and media[0]["url"]
    assert "lampiran_id" in media[0]


# --- PAGINASI ---

async def test_keyset_stabil_saat_data_ditambah(store, desa, svc_destinasi):
    k = await _pengelola(store, desa)
    for i in range(5):
        await svc_destinasi.buat(k, desa.id, _d(f"D{i}", f"d{i}", -5.79, 105.10))
    hal1 = await svc_destinasi.cari(Konteks(), desa.id, batas=2)
    id_hal1 = [i["destinasi"].id for i in hal1["item"]]
    assert len(id_hal1) == 2 and hal1["meta"]["ada_lagi"]

    await svc_destinasi.buat(k, desa.id, _d("Dbaru", "dbaru", -5.79, 105.10))

    hal2 = await svc_destinasi.cari(Konteks(), desa.id, batas=2, kursor=hal1["meta"]["kursor_berikutnya"])
    id_hal2 = [i["destinasi"].id for i in hal2["item"]]
    assert set(id_hal1).isdisjoint(id_hal2)

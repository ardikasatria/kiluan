"""Gerbang B3 — Discovery publik lintas-desa (Kontrak §4.1–4.2).

Gerbang: hanya `desa aktif`; publik tak melihat draft/soft-deleted; keyset
stabil + amplop meta; `desa=` scoping; filter kategori; `dekat` → jarak terurut.
"""
import pytest_asyncio

from app.domain import entitas as E
from app.domain.enums import KodePeran, StatusDesa, StatusKonten
from app.layanan.discovery import DiscoveryLayanan
from app.skema.destinasi import DestinasiBuat
from conftest import beri_peran, buat_pengguna, konteks_untuk


@pytest_asyncio.fixture
async def disc(store) -> DiscoveryLayanan:
    return DiscoveryLayanan(store)


@pytest_asyncio.fixture
async def desa_nonaktif(store) -> E.Desa:
    return await store.desa.tambah(
        E.Desa(slug="desa-rahasia", nama="Desa Rahasia", status=StatusDesa.nonaktif)
    )


async def _pengelola(store, desa):
    p = await buat_pengguna(store, email=f"{desa.slug}@contoh.id")
    await beri_peran(store, p.id, KodePeran.kontributor, desa_id=desa.id)
    return await konteks_untuk(store, p.id)


def _d(nama, slug, *, lat=-5.79, lng=105.10, kategori_id=1, status=StatusKonten.publikasi):
    return DestinasiBuat(nama=nama, slug=slug, kategori_id=kategori_id,
                         lokasi={"lat": lat, "lng": lng}, status=status)


async def test_desa_hanya_aktif(store, desa, desa_lain, desa_nonaktif, disc):
    hasil = await disc.daftar_desa()
    slug = {i["desa"].slug for i in hasil["item"]}
    assert slug == {desa.slug, desa_lain.slug}
    assert "desa-rahasia" not in slug


async def test_destinasi_publik_lintas_desa(store, desa, desa_lain, disc, svc_destinasi):
    ka = await _pengelola(store, desa)
    kb = await _pengelola(store, desa_lain)
    await svc_destinasi.buat(ka, desa.id, _d("Gigi Hiu", "gigi-hiu"))
    await svc_destinasi.buat(kb, desa_lain.id, _d("Pahawang Kecil", "pahawang-kecil"))
    hasil = await disc.cari_destinasi()
    nama = {i["destinasi"].nama for i in hasil["item"]}
    assert nama == {"Gigi Hiu", "Pahawang Kecil"}


async def test_draft_dan_soft_delete_tak_muncul(store, desa, disc, svc_destinasi):
    k = await _pengelola(store, desa)
    await svc_destinasi.buat(k, desa.id, _d("Draf", "draf", status=StatusKonten.draft))
    pub = await svc_destinasi.buat(k, desa.id, _d("Terbit", "terbit"))
    d2 = await svc_destinasi.buat(k, desa.id, _d("Dihapus", "dihapus"))
    await svc_destinasi.hapus(k, desa.id, d2.id)
    nama = {i["destinasi"].nama for i in (await disc.cari_destinasi())["item"]}
    assert nama == {"Terbit"}
    assert pub.status == StatusKonten.publikasi


async def test_destinasi_desa_nonaktif_tak_muncul(store, desa_nonaktif, disc, svc_destinasi):
    k = await _pengelola(store, desa_nonaktif)
    await svc_destinasi.buat(k, desa_nonaktif.id, _d("Tersembunyi", "tersembunyi"))
    assert (await disc.cari_destinasi())["item"] == []


async def test_filter_desa_dan_kategori(store, desa, desa_lain, disc, svc_destinasi):
    ka = await _pengelola(store, desa)
    kb = await _pengelola(store, desa_lain)
    await svc_destinasi.buat(ka, desa.id, _d("Snorkel", "snorkel", kategori_id=1))
    await svc_destinasi.buat(ka, desa.id, _d("Pantai", "pantai", kategori_id=2))
    await svc_destinasi.buat(kb, desa_lain.id, _d("Lain", "lain", kategori_id=1))

    hanya_desa = await disc.cari_destinasi(desa_slug=desa.slug)
    assert {i["destinasi"].nama for i in hanya_desa["item"]} == {"Snorkel", "Pantai"}

    kat1 = await disc.cari_destinasi(kategori_id=1)
    assert {i["destinasi"].nama for i in kat1["item"]} == {"Snorkel", "Lain"}


async def test_filter_desa_tak_dikenal_kosong(store, desa, disc):
    hasil = await disc.cari_destinasi(desa_slug="entah-mana")
    assert hasil["item"] == [] and hasil["meta"]["ada_lagi"] is False


async def test_dekat_terurut_jarak_dan_radius(store, desa, disc, svc_destinasi):
    k = await _pengelola(store, desa)
    await svc_destinasi.buat(k, desa.id, _d("Jauh", "jauh", lat=-6.3, lng=105.6))
    await svc_destinasi.buat(k, desa.id, _d("Sedang", "sedang", lat=-5.795, lng=105.10))
    await svc_destinasi.buat(k, desa.id, _d("Dekat", "dekat", lat=-5.791, lng=105.104))

    radius = await disc.cari_destinasi(dekat=(-5.79, 105.10), radius_m=5000)
    nama = [i["destinasi"].nama for i in radius["item"]]
    assert nama == ["Dekat", "Sedang"]
    assert radius["item"][0]["jarak_m"] <= radius["item"][1]["jarak_m"]


async def test_keyset_stabil_saat_data_ditambah(store, desa, disc, svc_destinasi):
    k = await _pengelola(store, desa)
    for i in range(5):
        await svc_destinasi.buat(k, desa.id, _d(f"D{i}", f"d{i}"))
    hal1 = await disc.cari_destinasi(batas=2)
    id1 = [i["destinasi"].id for i in hal1["item"]]
    assert len(id1) == 2 and hal1["meta"]["ada_lagi"]

    await svc_destinasi.buat(k, desa.id, _d("Baru", "baru"))
    hal2 = await disc.cari_destinasi(batas=2, kursor=hal1["meta"]["kursor_berikutnya"])
    id2 = [i["destinasi"].id for i in hal2["item"]]
    assert set(id1).isdisjoint(id2)


async def test_desa_keyset_meta(store, desa, desa_lain, disc):
    hasil = await disc.daftar_desa(batas=1)
    assert len(hasil["item"]) == 1
    assert hasil["meta"]["ada_lagi"] is True
    assert hasil["meta"]["kursor_berikutnya"] is not None

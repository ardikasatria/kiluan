"""Gerbang wishlist / simpanan."""
from uuid import uuid4

import pytest
import pytest_asyncio

from app.domain import entitas as E
from app.domain.enums import KodePeran, StatusKonten
from app.domain.errors import KesalahanValidasi, TidakDitemukan
from app.layanan.pasar_desa import PasarDesaLayanan
from app.layanan.simpanan import SimpananLayanan
from app.skema.destinasi import DestinasiBuat
from conftest import beri_peran, buat_pengguna, konteks_untuk


@pytest_asyncio.fixture
async def svc_simpanan(store):
    return SimpananLayanan(store)


@pytest_asyncio.fixture
async def svc_pasar(store, desa):
    from app.domain.seed_f1 import isi_lencana
    await isi_lencana(store)
    return PasarDesaLayanan(store)


async def _destinasi_publik(store, desa, svc_destinasi):
    p = await buat_pengguna(store)
    await beri_peran(store, p.id, KodePeran.kontributor, desa_id=desa.id)
    k = await konteks_untuk(store, p.id)
    return await svc_destinasi.buat(
        k, desa.id,
        DestinasiBuat(nama="Pantai", slug="pantai", kategori_id=1,
                      lokasi={"lat": -5.7, "lng": 105.1}, status=StatusKonten.publikasi),
    )


async def _paket_publik(store, desa):
    agen = await buat_pengguna(store, email="agen@x.id")
    p = E.PaketWisata(
        desa_id=desa.id, agen_id=agen.id, slug="snorkel", nama="Snorkel",
        durasi_jam=3, harga=150000, satuan_harga="per_orang", status="publikasi",
    )
    return await store.paket_wisata.simpan(p)


async def _misi_aktif(store, desa):
    m = E.MisiSimpel(desa_id=desa.id, kode="M-TEST", judul="Tanam Mangrove", aktif=True)
    return await store.misi.simpan(m)


@pytest.mark.asyncio
async def test_tambah_idempoten(store, desa, svc_destinasi, svc_simpanan):
    d = await _destinasi_publik(store, desa, svc_destinasi)
    u = await buat_pengguna(store, email="w@x.id")
    s1, b1 = await svc_simpanan.tambah(u.id, "destinasi", d.id)
    s2, b2 = await svc_simpanan.tambah(u.id, "destinasi", d.id)
    assert b1 is True and b2 is False
    assert s1.id == s2.id
    assert s1.desa_id == desa.id


@pytest.mark.asyncio
async def test_hapus_lintas_user_404(store, desa, svc_destinasi, svc_simpanan):
    d = await _destinasi_publik(store, desa, svc_destinasi)
    u1 = await buat_pengguna(store, email="a@x.id")
    u2 = await buat_pengguna(store, email="b@x.id")
    s, _ = await svc_simpanan.tambah(u1.id, "destinasi", d.id)
    with pytest.raises(TidakDitemukan):
        await svc_simpanan.hapus(u2.id, s.id)


@pytest.mark.asyncio
async def test_entitas_draft_404(store, desa, svc_destinasi, svc_simpanan):
    p = await buat_pengguna(store)
    await beri_peran(store, p.id, KodePeran.kontributor, desa_id=desa.id)
    k = await konteks_untuk(store, p.id)
    d = await svc_destinasi.buat(
        k, desa.id,
        DestinasiBuat(nama="Draf", slug="draf", kategori_id=1,
                      lokasi={"lat": -5.7, "lng": 105.1}, status=StatusKonten.draft),
    )
    u = await buat_pengguna(store, email="w2@x.id")
    with pytest.raises(TidakDitemukan):
        await svc_simpanan.tambah(u.id, "destinasi", d.id)


@pytest.mark.asyncio
async def test_tipe_tidak_valid(store, desa, svc_simpanan):
    u = await buat_pengguna(store)
    with pytest.raises(KesalahanValidasi):
        await svc_simpanan.tambah(u.id, "hotel", uuid4())


@pytest.mark.asyncio
async def test_status_check(store, desa, svc_destinasi, svc_simpanan):
    d = await _destinasi_publik(store, desa, svc_destinasi)
    u = await buat_pengguna(store, email="w3@x.id")
    await svc_simpanan.tambah(u.id, "destinasi", d.id)
    item = await svc_simpanan.status(u.id, "destinasi", [d.id])
    assert item[0]["disimpan"] is True
    assert item[0]["simpanan_id"]


async def _produk_publik(store, desa, svc_pasar):
    umkm_user = await buat_pengguna(store, email="umkm-w@x.id")
    await beri_peran(store, umkm_user.id, KodePeran.umkm, desa_id=desa.id)
    pokdarwis = await buat_pengguna(store, email="pok-w@x.id")
    await beri_peran(store, pokdarwis.id, KodePeran.kontributor, desa_id=desa.id)
    k_umkm = await konteks_untuk(store, umkm_user.id)
    k_pok = await konteks_untuk(store, pokdarwis.id)
    umkm = await svc_pasar.daftar_umkm(k_umkm, desa.id, {"bidang_id": 1, "nama": "Toko Test"})
    await svc_pasar.verifikasi_umkm(k_pok, desa.id, umkm.id, "terverifikasi")
    produk = await svc_pasar.buat_produk(k_umkm, desa.id, {
        "umkm_id": umkm.id, "nama": "Kerajinan", "jenis": "produk",
        "harga": 50000, "satuan_harga": "per_unit", "stok": 5,
    })
    await svc_pasar.ubah_status_produk(k_umkm, desa.id, produk.id, "publikasi")
    return produk


@pytest.mark.asyncio
async def test_produk_simpanan(store, desa, svc_simpanan, svc_pasar):
    produk = await _produk_publik(store, desa, svc_pasar)
    u = await buat_pengguna(store, email="w5@x.id")
    s, baru = await svc_simpanan.tambah(u.id, "produk", produk.id)
    assert baru is True
    assert s.tipe == "produk"
    item = await svc_simpanan.status(u.id, "produk", [produk.id])
    assert item[0]["disimpan"] is True
    hal = await svc_simpanan.daftar(u.id, tipe="produk")
    assert len(hal["item"]) == 1
    assert hal["item"][0]["entitas"]["nama"] == "Kerajinan"


@pytest.mark.asyncio
async def test_produk_draft_tidak_bisa_disimpan(store, desa, svc_simpanan, svc_pasar):
    umkm_user = await buat_pengguna(store, email="umkm-d@x.id")
    await beri_peran(store, umkm_user.id, KodePeran.umkm, desa_id=desa.id)
    k_umkm = await konteks_untuk(store, umkm_user.id)
    umkm = await svc_pasar.daftar_umkm(k_umkm, desa.id, {"bidang_id": 1, "nama": "Draft Shop"})
    produk = await svc_pasar.buat_produk(k_umkm, desa.id, {
        "umkm_id": umkm.id, "nama": "Draft Item", "jenis": "produk",
        "harga": 10000, "satuan_harga": "per_unit", "stok": 1,
    })
    u = await buat_pengguna(store, email="w6@x.id")
    with pytest.raises(TidakDitemukan):
        await svc_simpanan.tambah(u.id, "produk", produk.id)


@pytest.mark.asyncio
async def test_paket_dan_misi(store, desa, svc_simpanan):
    paket = await _paket_publik(store, desa)
    misi = await _misi_aktif(store, desa)
    u = await buat_pengguna(store, email="w4@x.id")
    await svc_simpanan.tambah(u.id, "paket", paket.id)
    await svc_simpanan.tambah(u.id, "misi", misi.id)
    wis = await svc_simpanan.daftar(u.id, tipe="paket")
    mis = await svc_simpanan.daftar(u.id, tipe="misi")
    assert len(wis["item"]) == 1
    assert len(mis["item"]) == 1
    assert wis["item"][0]["entitas"]["nama"] == "Snorkel"

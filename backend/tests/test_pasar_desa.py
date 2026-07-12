"""Gerbang kontrak F1 §3 — Pasar Desa (port dari scaffold kiluan_f1)."""
from __future__ import annotations

import pytest
import pytest_asyncio

from app.domain.enums import KodePeran
from app.domain.errors import Konflik, KesalahanValidasi, TidakBerwenang, TidakDitemukan, TransisiIlegal
from app.domain.seed_f1 import isi_lencana
from app.layanan.pasar_desa import PasarDesaLayanan
from tests.conftest import beri_peran, buat_pengguna, konteks_untuk


@pytest_asyncio.fixture
async def pasar(store, desa):
    await isi_lencana(store)
    return PasarDesaLayanan(store)


async def _buat_umkm_terverifikasi(pasar_svc, store, desa):
    umkm_user = await buat_pengguna(store, email="umkm@contoh.id")
    await beri_peran(store, umkm_user.id, KodePeran.umkm, desa.id)
    pokdarwis = await buat_pengguna(store, email="pok@contoh.id")
    await beri_peran(store, pokdarwis.id, KodePeran.pokdarwis, desa.id)
    agen = await buat_pengguna(store, email="agen@contoh.id")
    await beri_peran(store, agen.id, KodePeran.agen, desa.id)
    agen2 = await buat_pengguna(store, email="agen2@contoh.id")
    await beri_peran(store, agen2.id, KodePeran.agen, desa.id)
    k_umkm = await konteks_untuk(store, umkm_user.id)
    k_pok = await konteks_untuk(store, pokdarwis.id)
    k_agen = await konteks_untuk(store, agen.id)
    k_agen2 = await konteks_untuk(store, agen2.id)
    umkm = await pasar_svc.daftar_umkm(k_umkm, desa.id, {"bidang_id": 1, "nama": "Kopi Kiluan"})
    await pasar_svc.verifikasi_umkm(k_pok, desa.id, umkm.id, "terverifikasi")
    return k_umkm, k_pok, k_agen, k_agen2, umkm


@pytest.mark.asyncio
async def test_umkm_belum_terverifikasi_gagal_publikasi(pasar, store, desa):
    k_umkm, k_pok, _, _, umkm = await _buat_umkm_terverifikasi(pasar, store, desa)
    umkm.status_verifikasi = "menunggu"
    await store.umkm.simpan(umkm)
    produk = await pasar.buat_produk(k_umkm, desa.id, {
        "umkm_id": umkm.id, "nama": "Kopi", "jenis": "produk",
        "harga": 45000, "satuan_harga": "per_unit", "stok": 10,
    })
    with pytest.raises(KesalahanValidasi):
        await pasar.ubah_status_produk(k_umkm, desa.id, produk.id, "publikasi")


@pytest.mark.asyncio
async def test_umkm_terverifikasi_bisa_publikasi(pasar, store, desa):
    k_umkm, _, _, _, umkm = await _buat_umkm_terverifikasi(pasar, store, desa)
    produk = await pasar.buat_produk(k_umkm, desa.id, {
        "umkm_id": umkm.id, "nama": "Kopi", "jenis": "produk",
        "harga": 45000, "satuan_harga": "per_unit", "stok": 10,
    })
    hasil = await pasar.ubah_status_produk(k_umkm, desa.id, produk.id, "publikasi")
    assert hasil.status == "publikasi"


@pytest.mark.asyncio
async def test_produk_terdaftar_memberi_poin(pasar, store, desa):
    k_umkm, _, _, _, umkm = await _buat_umkm_terverifikasi(pasar, store, desa)
    await pasar.buat_produk(k_umkm, desa.id, {
        "umkm_id": umkm.id, "nama": "Kopi", "jenis": "produk",
        "harga": 45000, "satuan_harga": "per_unit", "stok": 10,
    })
    saldo = await pasar.poin.saldo(desa.id, umkm.pengguna_id)
    assert saldo == 10


@pytest.mark.asyncio
async def test_paket_transisi_draft_ke_review(pasar, store, desa):
    _, _, k_agen, _, _ = await _buat_umkm_terverifikasi(pasar, store, desa)
    paket = await pasar.buat_paket(k_agen, desa.id, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    hasil = await pasar.transisi_paket(k_agen, desa.id, paket.id, "ajukan")
    assert hasil.status == "review"


@pytest.mark.asyncio
async def test_paket_transisi_review_ke_publikasi(pasar, store, desa):
    _, k_pok, k_agen, _, _ = await _buat_umkm_terverifikasi(pasar, store, desa)
    paket = await pasar.buat_paket(k_agen, desa.id, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    await pasar.transisi_paket(k_agen, desa.id, paket.id, "ajukan")
    hasil = await pasar.transisi_paket(k_pok, desa.id, paket.id, "setuju")
    assert hasil.status == "publikasi"
    saldo = await pasar.poin.saldo(desa.id, k_agen.pengguna_id)
    assert saldo == 30


@pytest.mark.asyncio
async def test_paket_ditolak_bisa_ajukan_ulang(pasar, store, desa):
    _, k_pok, k_agen, _, _ = await _buat_umkm_terverifikasi(pasar, store, desa)
    paket = await pasar.buat_paket(k_agen, desa.id, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    await pasar.transisi_paket(k_agen, desa.id, paket.id, "ajukan")
    await pasar.transisi_paket(k_pok, desa.id, paket.id, "tolak", "Perlu perbaikan")
    hasil = await pasar.transisi_paket(k_agen, desa.id, paket.id, "ajukan")
    assert hasil.status == "review"


@pytest.mark.asyncio
async def test_paket_transisi_ilegal_langung_publikasi(pasar, store, desa):
    _, k_pok, k_agen, _, _ = await _buat_umkm_terverifikasi(pasar, store, desa)
    paket = await pasar.buat_paket(k_agen, desa.id, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    with pytest.raises(TransisiIlegal):
        await pasar.transisi_paket(k_pok, desa.id, paket.id, "setuju")


@pytest.mark.asyncio
async def test_paket_transisi_menulis_log(pasar, store, desa):
    _, _, k_agen, _, _ = await _buat_umkm_terverifikasi(pasar, store, desa)
    paket = await pasar.buat_paket(k_agen, desa.id, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    await pasar.transisi_paket(k_agen, desa.id, paket.id, "ajukan")
    logs = await store.kurasi_log.cari(entitas_tipe="paket_wisata", entitas_id=paket.id)
    assert len(logs) == 1
    assert logs[0].keputusan == "ajukan"


@pytest.mark.asyncio
async def test_paket_arsip_tanpa_log(pasar, store, desa):
    _, k_pok, k_agen, _, _ = await _buat_umkm_terverifikasi(pasar, store, desa)
    paket = await pasar.buat_paket(k_agen, desa.id, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    await pasar.transisi_paket(k_agen, desa.id, paket.id, "ajukan")
    await pasar.transisi_paket(k_pok, desa.id, paket.id, "setuju")
    n_sebelum = await store.kurasi_log.hitung()
    await pasar.transisi_paket(k_agen, desa.id, paket.id, "arsip")
    n_sesudah = await store.kurasi_log.hitung()
    assert n_sesudah == n_sebelum


@pytest.mark.asyncio
async def test_paket_slug_bentrok_409(pasar, store, desa):
    _, _, k_agen, _, _ = await _buat_umkm_terverifikasi(pasar, store, desa)
    await pasar.buat_paket(k_agen, desa.id, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    with pytest.raises(Konflik):
        await pasar.buat_paket(k_agen, desa.id, {
            "slug": "trip-lumba", "nama": "Trip Lumba 2", "durasi_jam": 24,
            "harga": 500000, "satuan_harga": "per_paket",
        })


@pytest.mark.asyncio
async def test_paket_item_wajib_referensi_atau_judul(pasar, store, desa):
    _, _, k_agen, _, _ = await _buat_umkm_terverifikasi(pasar, store, desa)
    paket = await pasar.buat_paket(k_agen, desa.id, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    with pytest.raises(KesalahanValidasi):
        await pasar.tambah_item_paket(k_agen, desa.id, paket.id, {"hari": 1, "urutan": 1})


@pytest.mark.asyncio
async def test_paket_item_dengan_judul_ok(pasar, store, desa):
    _, _, k_agen, _, _ = await _buat_umkm_terverifikasi(pasar, store, desa)
    paket = await pasar.buat_paket(k_agen, desa.id, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    item = await pasar.tambah_item_paket(k_agen, desa.id, paket.id, {
        "hari": 1, "urutan": 1, "judul": "Snorkeling",
    })
    assert item.judul == "Snorkeling"


@pytest.mark.asyncio
async def test_paket_setuju_butuh_pengelola(pasar, store, desa):
    _, _, k_agen, _, _ = await _buat_umkm_terverifikasi(pasar, store, desa)
    paket = await pasar.buat_paket(k_agen, desa.id, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    await pasar.transisi_paket(k_agen, desa.id, paket.id, "ajukan")
    with pytest.raises(TidakBerwenang):
        await pasar.transisi_paket(k_agen, desa.id, paket.id, "setuju")


@pytest.mark.asyncio
async def test_verifikasi_butuh_pengelola(pasar, store, desa):
    umkm_user = await buat_pengguna(store, email="umkm2@contoh.id")
    await beri_peran(store, umkm_user.id, KodePeran.umkm, desa.id)
    k_umkm = await konteks_untuk(store, umkm_user.id)
    umkm = await pasar.daftar_umkm(k_umkm, desa.id, {"bidang_id": 1, "nama": "Kopi"})
    with pytest.raises(TidakBerwenang):
        await pasar.verifikasi_umkm(k_umkm, desa.id, umkm.id, "terverifikasi")


@pytest.mark.asyncio
async def test_umkm_lintas_tenant_404(pasar, store, desa, desa_lain):
    umkm_user = await buat_pengguna(store, email="umkm3@contoh.id")
    await beri_peran(store, umkm_user.id, KodePeran.umkm, desa.id)
    k_umkm = await konteks_untuk(store, umkm_user.id)
    umkm = await pasar.daftar_umkm(k_umkm, desa.id, {"bidang_id": 1, "nama": "Kopi"})
    with pytest.raises(TidakDitemukan):
        await pasar.ambil_umkm_kelola(k_umkm, desa_lain.id, umkm.id)


@pytest.mark.asyncio
async def test_paket_lintas_tenant_404(pasar, store, desa, desa_lain):
    _, _, k_agen, _, _ = await _buat_umkm_terverifikasi(pasar, store, desa)
    paket = await pasar.buat_paket(k_agen, desa.id, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    with pytest.raises(TidakDitemukan):
        await pasar._ambil_paket(desa_lain.id, paket.id)


@pytest.mark.asyncio
async def test_agen_tidak_bisa_ubah_paket_agen_lain(pasar, store, desa):
    _, _, k_agen, k_agen2, _ = await _buat_umkm_terverifikasi(pasar, store, desa)
    paket = await pasar.buat_paket(k_agen, desa.id, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    with pytest.raises(TidakBerwenang):
        await pasar.tambah_item_paket(k_agen2, desa.id, paket.id, {
            "hari": 1, "urutan": 1, "judul": "Snorkeling",
        })


@pytest.mark.asyncio
async def test_umkm_soft_delete_menyembunyikan_dari_publik(pasar, store, desa):
    k_umkm, _, _, _, umkm = await _buat_umkm_terverifikasi(pasar, store, desa)
    await pasar.hapus_umkm(k_umkm, desa.id, umkm.id)
    hal = await pasar.daftar_umkm_publik(desa.id)
    assert len(hal["item"]) == 0


@pytest.mark.asyncio
async def test_detail_produk_publik(pasar, store, desa):
    k_umkm, _, _, _, umkm = await _buat_umkm_terverifikasi(pasar, store, desa)
    produk = await pasar.buat_produk(k_umkm, desa.id, {
        "umkm_id": umkm.id, "nama": "Kopi", "jenis": "produk",
        "harga": 45000, "satuan_harga": "per_unit", "stok": 10,
    })
    await pasar.ubah_status_produk(k_umkm, desa.id, produk.id, "publikasi")
    detail = await pasar.detail_produk(desa.id, produk.id)
    assert detail["nama"] == "Kopi"
    assert detail["umkm"]["nama"] == "Kopi Kiluan"
    assert detail["status"] == "publikasi"
    assert isinstance(detail["media"], list)


@pytest.mark.asyncio
async def test_detail_produk_draft_tidak_publik(pasar, store, desa):
    k_umkm, _, _, _, umkm = await _buat_umkm_terverifikasi(pasar, store, desa)
    produk = await pasar.buat_produk(k_umkm, desa.id, {
        "umkm_id": umkm.id, "nama": "Draft Kopi", "jenis": "produk",
        "harga": 45000, "satuan_harga": "per_unit", "stok": 10,
    })
    with pytest.raises(TidakDitemukan):
        await pasar.detail_produk(desa.id, produk.id)


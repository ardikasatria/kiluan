"""Gerbang kontrak §10 — Pasar Desa."""
from __future__ import annotations

import pytest

from kiluan_f1.errors import Konflik, TidakBerwenang, TidakDitemukan, TransisiIlegal, ValidasiGagal
from tests.conftest import (
    DESA_A,
    DESA_B,
    aktor_agen,
    aktor_agen2,
    aktor_pokdarwis,
    aktor_umkm,
    aktor_warga,
    buat_destinasi,
    buat_umkm_terverifikasi,
)


@pytest.mark.asyncio
async def test_umkm_belum_terverifikasi_gagal_publikasi(app):
    aktor, umkm = await buat_umkm_terverifikasi(app)
    # revert verifikasi
    umkm.status_verifikasi = "menunggu"
    await app.repo_umkm.simpan(umkm)
    produk = await app.produk.buat(aktor, DESA_A, {
        "umkm_id": umkm.id, "nama": "Kopi", "jenis": "produk",
        "harga": 45000, "satuan_harga": "per_item", "stok": 10,
    })
    with pytest.raises(ValidasiGagal):
        await app.produk.ubah_status(aktor, DESA_A, produk.id, "publikasi")


@pytest.mark.asyncio
async def test_umkm_terverifikasi_bisa_publikasi(app):
    aktor, umkm = await buat_umkm_terverifikasi(app)
    produk = await app.produk.buat(aktor, DESA_A, {
        "umkm_id": umkm.id, "nama": "Kopi", "jenis": "produk",
        "harga": 45000, "satuan_harga": "per_item", "stok": 10,
    })
    hasil = await app.produk.ubah_status(aktor, DESA_A, produk.id, "publikasi")
    assert hasil.status == "publikasi"


@pytest.mark.asyncio
async def test_produk_terdaftar_memberi_poin(app):
    aktor, umkm = await buat_umkm_terverifikasi(app)
    produk = await app.produk.buat(aktor, DESA_A, {
        "umkm_id": umkm.id, "nama": "Kopi", "jenis": "produk",
        "harga": 45000, "satuan_harga": "per_item", "stok": 10,
    })
    saldo = await app.poin.saldo(DESA_A, umkm.pengguna_id)
    assert saldo == 10
    assert produk.id is not None


@pytest.mark.asyncio
async def test_paket_transisi_draft_ke_review(app):
    paket = await app.paket.buat(aktor_agen(), DESA_A, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    hasil = await app.paket.transisi(aktor_agen(), DESA_A, paket.id, "ajukan")
    assert hasil.status == "review"


@pytest.mark.asyncio
async def test_paket_transisi_review_ke_publikasi(app):
    paket = await app.paket.buat(aktor_agen(), DESA_A, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    await app.paket.transisi(aktor_agen(), DESA_A, paket.id, "ajukan")
    hasil = await app.paket.transisi(aktor_pokdarwis(), DESA_A, paket.id, "setuju")
    assert hasil.status == "publikasi"
    saldo = await app.poin.saldo(DESA_A, aktor_agen().pengguna_id)
    assert saldo == 30


@pytest.mark.asyncio
async def test_paket_transisi_ilegal_langung_publikasi(app):
    paket = await app.paket.buat(aktor_agen(), DESA_A, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    with pytest.raises(TransisiIlegal):
        await app.paket.transisi(aktor_pokdarwis(), DESA_A, paket.id, "setuju")


@pytest.mark.asyncio
async def test_paket_transisi_menulis_log(app):
    paket = await app.paket.buat(aktor_agen(), DESA_A, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    await app.paket.transisi(aktor_agen(), DESA_A, paket.id, "ajukan")
    logs = await app.repo_kurasi_log.cari(entitas_tipe="paket_wisata", entitas_id=paket.id)
    assert len(logs) == 1
    assert logs[0].keputusan == "ajukan"


@pytest.mark.asyncio
async def test_paket_arsip_tanpa_log(app):
    paket = await app.paket.buat(aktor_agen(), DESA_A, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    await app.paket.transisi(aktor_agen(), DESA_A, paket.id, "ajukan")
    await app.paket.transisi(aktor_pokdarwis(), DESA_A, paket.id, "setuju")
    n_sebelum = await app.repo_kurasi_log.hitung()
    await app.paket.transisi(aktor_agen(), DESA_A, paket.id, "arsip")
    n_sesudah = await app.repo_kurasi_log.hitung()
    assert n_sesudah == n_sebelum


@pytest.mark.asyncio
async def test_paket_slug_bentrok_409(app):
    await app.paket.buat(aktor_agen(), DESA_A, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    with pytest.raises(Konflik):
        await app.paket.buat(aktor_agen(), DESA_A, {
            "slug": "trip-lumba", "nama": "Trip Lumba 2", "durasi_jam": 24,
            "harga": 500000, "satuan_harga": "per_paket",
        })


@pytest.mark.asyncio
async def test_paket_item_wajib_referensi_atau_judul(app):
    paket = await app.paket.buat(aktor_agen(), DESA_A, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    with pytest.raises(ValidasiGagal):
        await app.paket.tambah_item(aktor_agen(), DESA_A, paket.id, {"hari": 1, "urutan": 1})


@pytest.mark.asyncio
async def test_paket_item_dengan_judul_ok(app):
    paket = await app.paket.buat(aktor_agen(), DESA_A, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    item = await app.paket.tambah_item(aktor_agen(), DESA_A, paket.id, {
        "hari": 1, "urutan": 1, "judul": "Snorkeling",
    })
    assert item.judul == "Snorkeling"


@pytest.mark.asyncio
async def test_paket_setuju_butuh_pengelola(app):
    paket = await app.paket.buat(aktor_agen(), DESA_A, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    await app.paket.transisi(aktor_agen(), DESA_A, paket.id, "ajukan")
    with pytest.raises(TidakBerwenang):
        await app.paket.transisi(aktor_agen(), DESA_A, paket.id, "setuju")


@pytest.mark.asyncio
async def test_verifikasi_butuh_pengelola(app):
    umkm = await app.umkm.daftar(aktor_umkm(), DESA_A, {"bidang_id": 1, "nama": "Kopi"})
    with pytest.raises(TidakBerwenang):
        await app.umkm.verifikasi(aktor_umkm(), DESA_A, umkm.id, "terverifikasi")


@pytest.mark.asyncio
async def test_umkm_lintas_tenant_404(app):
    umkm = await app.umkm.daftar(aktor_umkm(), DESA_A, {"bidang_id": 1, "nama": "Kopi"})
    with pytest.raises(TidakDitemukan):
        await app.umkm.ambil_kelola(aktor_umkm(), DESA_B, umkm.id)


@pytest.mark.asyncio
async def test_paket_lintas_tenant_404(app):
    paket = await app.paket.buat(aktor_agen(), DESA_A, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    with pytest.raises(TidakDitemukan):
        await app.paket._ambil(DESA_B, paket.id)


@pytest.mark.asyncio
async def test_agen_tidak_bisa_ubah_paket_agen_lain(app):
    paket = await app.paket.buat(aktor_agen(), DESA_A, {
        "slug": "trip-lumba", "nama": "Trip Lumba", "durasi_jam": 30,
        "harga": 750000, "satuan_harga": "per_paket",
    })
    with pytest.raises(TidakBerwenang):
        await app.paket.tambah_item(aktor_agen2(), DESA_A, paket.id, {
            "hari": 1, "urutan": 1, "judul": "Snorkeling",
        })


@pytest.mark.asyncio
async def test_umkm_soft_delete_menyembunyikan_dari_publik(app):
    aktor, umkm = await buat_umkm_terverifikasi(app)
    await app.umkm.hapus(aktor, DESA_A, umkm.id)
    hal = await app.umkm.daftar_publik(DESA_A)
    assert len(hal.item) == 0

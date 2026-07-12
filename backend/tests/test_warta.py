"""Gerbang kontrak addendum F2 — Warta (berita/blog)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio

from app.domain.errors import Konflik, TidakBerwenang, TidakDitemukan
from app.domain.enums import KodePeran
from app.layanan.warta import WartaLayanan
from tests.conftest import beri_peran, buat_pengguna, konteks_untuk


@pytest_asyncio.fixture
async def warta(store):
    return WartaLayanan(store)


@pytest_asyncio.fixture
async def aktor_pokdarwis(store, desa):
    p = await buat_pengguna(store, email="pok@warta.id")
    await beri_peran(store, p.id, KodePeran.pokdarwis, desa.id)
    return await konteks_untuk(store, p.id)


@pytest_asyncio.fixture
async def aktor_wisatawan(store, desa):
    p = await buat_pengguna(store, email="wis@warta.id")
    await beri_peran(store, p.id, KodePeran.wisatawan, desa.id)
    return await konteks_untuk(store, p.id)


@pytest.mark.asyncio
async def test_publik_hanya_publikasi_terbit(warta, desa, aktor_pokdarwis, aktor_wisatawan):
    masa_depan = datetime.now(timezone.utc) + timedelta(days=7)
    b = await warta.buat(aktor_pokdarwis, desa.id, {
        "slug": "jadwal", "judul": "Artikel Terjadwal", "konten": "isi",
    })
    await warta.ubah_status(aktor_pokdarwis, desa.id, b.id, "publikasi", terbit_pada=masa_depan)

    publik = await warta.daftar(aktor_wisatawan, desa.id)
    assert len(publik["item"]) == 0

    kelola = await warta.daftar(aktor_pokdarwis, desa.id, status="publikasi")
    assert len(kelola["item"]) == 1


@pytest.mark.asyncio
async def test_slug_duplikat_409(warta, desa, aktor_pokdarwis):
    await warta.buat(aktor_pokdarwis, desa.id, {"slug": "sama", "judul": "A", "konten": "x"})
    with pytest.raises(Konflik):
        await warta.buat(aktor_pokdarwis, desa.id, {"slug": "sama", "judul": "B", "konten": "y"})


@pytest.mark.asyncio
async def test_soft_delete_hilang_publik(warta, desa, aktor_pokdarwis, aktor_wisatawan):
    b = await warta.buat(aktor_pokdarwis, desa.id, {"slug": "hapus", "judul": "H", "konten": "x"})
    await warta.ubah_status(aktor_pokdarwis, desa.id, b.id, "publikasi")
    await warta.hapus(aktor_pokdarwis, desa.id, b.id)
    publik = await warta.daftar(aktor_wisatawan, desa.id)
    assert len(publik["item"]) == 0


@pytest.mark.asyncio
async def test_wisatawan_tidak_bisa_buat(warta, desa, aktor_wisatawan):
    with pytest.raises(TidakBerwenang):
        await warta.buat(aktor_wisatawan, desa.id, {"slug": "x", "judul": "X", "konten": "z"})


@pytest.mark.asyncio
async def test_keyset_stabil(warta, desa, aktor_pokdarwis, aktor_wisatawan):
    for i in range(3):
        b = await warta.buat(aktor_pokdarwis, desa.id, {
            "slug": f"art-{i}", "judul": f"Art {i}", "konten": "isi",
        })
        await warta.ubah_status(aktor_pokdarwis, desa.id, b.id, "publikasi")
    hal1 = await warta.daftar(aktor_wisatawan, desa.id, batas=2)
    assert len(hal1["item"]) == 2
    assert hal1["meta"]["ada_lagi"] is True
    hal2 = await warta.daftar(
        aktor_wisatawan, desa.id, batas=2, kursor=hal1["meta"]["kursor_berikutnya"],
    )
    assert len(hal2["item"]) == 1
    ids = {x["id"] for x in hal1["item"] + hal2["item"]}
    assert len(ids) == 3


@pytest.mark.asyncio
async def test_detail_slug_publik(warta, desa, aktor_pokdarwis, aktor_wisatawan):
    await warta.buat(aktor_pokdarwis, desa.id, {"slug": "by-slug", "judul": "S", "konten": "k"})
    with pytest.raises(TidakDitemukan):
        await warta.detail(aktor_wisatawan, desa.id, "by-slug")

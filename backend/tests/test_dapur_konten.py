"""Gerbang kontrak F1 §4 — Dapur Konten (port dari scaffold kiluan_f1)."""
from __future__ import annotations

import pytest
import pytest_asyncio

from app.domain import entitas as E
from app.domain.enums import KodePeran, StatusKonten, StatusDesa
from app.domain.errors import KesalahanValidasi, TidakBerwenang, TidakDitemukan, TransisiIlegal
from app.domain.seed_f1 import isi_lencana
from app.layanan.dapur_konten import DapurKontenLayanan
from tests.conftest import beri_peran, buat_pengguna, konteks_untuk


@pytest_asyncio.fixture
async def dapur(store, desa):
    await isi_lencana(store)
    return DapurKontenLayanan(store)


async def _buat_destinasi(store, desa):
    return await store.destinasi.tambah(
        E.Destinasi(
            desa_id=desa.id,
            nama="Laguna",
            slug="laguna",
            kategori_id=1,
            lokasi=(-5.791, 105.103),
            status=StatusKonten.publikasi,
        )
    )


@pytest_asyncio.fixture
async def aktor_warga(store, desa):
    p = await buat_pengguna(store, email="warga@contoh.id")
    await beri_peran(store, p.id, KodePeran.wisatawan, desa.id)
    return await konteks_untuk(store, p.id)


@pytest_asyncio.fixture
async def aktor_pokdarwis(store, desa):
    p = await buat_pengguna(store, email="pok@kontribusi.id")
    await beri_peran(store, p.id, KodePeran.pokdarwis, desa.id)
    return await konteks_untuk(store, p.id)


@pytest.mark.asyncio
async def test_transisi_ilegal_kontribusi(dapur, desa, aktor_warga, aktor_pokdarwis):
    k = await dapur.kirim(aktor_warga, desa.id, {
        "tipe": "tips", "target_tipe": "desa", "muatan": {"isi": "tips bagus"},
    })
    await dapur.transisi(aktor_pokdarwis, desa.id, k.id, "setuju")
    with pytest.raises(TransisiIlegal):
        await dapur.transisi(aktor_pokdarwis, desa.id, k.id, "minta_revisi")


@pytest.mark.asyncio
async def test_setuju_dua_kali_poin_idempoten(dapur, store, desa, aktor_warga, aktor_pokdarwis):
    dest = await _buat_destinasi(store, desa)
    k = await dapur.kirim(aktor_warga, desa.id, {
        "tipe": "tips", "target_tipe": "destinasi", "target_id": dest.id,
        "muatan": {"isi": "tips bagus"},
    })
    await dapur.transisi(aktor_pokdarwis, desa.id, k.id, "setuju")
    await dapur.poin.award(desa.id, aktor_warga.pengguna_id, "kontribusi_disetujui", "kontribusi", k.id)
    await dapur.poin.award(desa.id, aktor_warga.pengguna_id, "kontribusi_disetujui", "kontribusi", k.id)
    saldo = await dapur.poin.saldo(desa.id, aktor_warga.pengguna_id)
    assert saldo == 20
    transaksi = await store.transaksi_poin.cari(
        pengguna_id=aktor_warga.pengguna_id, kode_aksi="kontribusi_disetujui",
    )
    assert len(transaksi) == 1


@pytest.mark.asyncio
async def test_kontribusi_setuju_menulis_log(dapur, store, desa, aktor_warga, aktor_pokdarwis):
    k = await dapur.kirim(aktor_warga, desa.id, {
        "tipe": "tips", "target_tipe": "desa", "muatan": {"isi": "tips"},
    })
    await dapur.transisi(aktor_pokdarwis, desa.id, k.id, "setuju")
    logs = await store.kurasi_log.cari(entitas_tipe="kontribusi", entitas_id=k.id)
    assert len(logs) == 1
    assert logs[0].ke_status == "disetujui"


@pytest.mark.asyncio
async def test_transisi_kontribusi_revisi_ajukan(dapur, desa, aktor_warga, aktor_pokdarwis):
    k = await dapur.kirim(aktor_warga, desa.id, {
        "tipe": "tips", "target_tipe": "desa", "muatan": {"isi": "v1"},
    })
    await dapur.transisi(aktor_pokdarwis, desa.id, k.id, "minta_revisi", "perbaiki")
    await dapur.revisi(aktor_warga, desa.id, k.id, {"isi": "v2"})
    hasil = await dapur.transisi(aktor_warga, desa.id, k.id, "ajukan")
    assert hasil.status == "menunggu"


@pytest.mark.asyncio
async def test_kontribusi_antrean_butuh_pengelola(dapur, desa, aktor_warga):
    with pytest.raises(TidakBerwenang):
        await dapur.daftar(aktor_warga, desa.id)


@pytest.mark.asyncio
async def test_kontribusi_foto_wajib_media(dapur, desa, aktor_warga):
    with pytest.raises(KesalahanValidasi):
        await dapur.kirim(aktor_warga, desa.id, {
            "tipe": "foto", "target_tipe": "desa", "muatan": {},
        })


@pytest.mark.asyncio
async def test_target_lintas_desa_404(dapur, store, desa, desa_lain, aktor_warga):
    dest = await store.destinasi.tambah(
        E.Destinasi(
            desa_id=desa_lain.id,
            nama="Lain",
            slug="lain",
            kategori_id=1,
            lokasi=(-5.79, 105.10),
            status=StatusKonten.publikasi,
        )
    )
    with pytest.raises(TidakDitemukan):
        await dapur.kirim(aktor_warga, desa.id, {
            "tipe": "tips", "target_tipe": "destinasi", "target_id": dest.id,
            "muatan": {"isi": "x"},
        })

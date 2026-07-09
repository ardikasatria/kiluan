"""Gerbang kontrak §10 — Dapur Konten."""
from __future__ import annotations

import pytest

from kiluan_f1.errors import TidakBerwenang, TransisiIlegal
from tests.conftest import DESA_A, aktor_pokdarwis, aktor_warga, buat_destinasi


@pytest.mark.asyncio
async def test_transisi_ilegal_kontribusi(app):
    k = await app.kontribusi.kirim(aktor_warga(), DESA_A, {
        "tipe": "tips", "target_tipe": "desa", "muatan": {"isi": "tips bagus"},
    })
    await app.kontribusi.transisi(aktor_pokdarwis(), DESA_A, k.id, "setuju")
    with pytest.raises(TransisiIlegal):
        await app.kontribusi.transisi(aktor_pokdarwis(), DESA_A, k.id, "minta_revisi")


@pytest.mark.asyncio
async def test_setuju_dua_kali_poin_idempoten(app):
    dest = await buat_destinasi(app)
    k = await app.kontribusi.kirim(aktor_warga(), DESA_A, {
        "tipe": "tips", "target_tipe": "destinasi", "target_id": dest.id,
        "muatan": {"isi": "tips bagus"},
    })
    await app.kontribusi.transisi(aktor_pokdarwis(), DESA_A, k.id, "setuju")
    # simulasi retry/klik ganda pada award (idempoten di layer poin)
    await app.poin.award(DESA_A, aktor_warga().pengguna_id, "kontribusi_disetujui", "kontribusi", k.id)
    await app.poin.award(DESA_A, aktor_warga().pengguna_id, "kontribusi_disetujui", "kontribusi", k.id)
    saldo = await app.poin.saldo(DESA_A, aktor_warga().pengguna_id)
    assert saldo == 20
    transaksi = await app.repo_transaksi_poin.cari(
        pengguna_id=aktor_warga().pengguna_id, kode_aksi="kontribusi_disetujui",
    )
    assert len(transaksi) == 1


@pytest.mark.asyncio
async def test_kontribusi_setuju_menulis_log(app):
    k = await app.kontribusi.kirim(aktor_warga(), DESA_A, {
        "tipe": "tips", "target_tipe": "desa", "muatan": {"isi": "tips"},
    })
    await app.kontribusi.transisi(aktor_pokdarwis(), DESA_A, k.id, "setuju")
    logs = await app.repo_kurasi_log.cari(entitas_tipe="kontribusi", entitas_id=k.id)
    assert len(logs) == 1
    assert logs[0].ke_status == "disetujui"


@pytest.mark.asyncio
async def test_transisi_kontribusi_revisi_ajukan(app):
    k = await app.kontribusi.kirim(aktor_warga(), DESA_A, {
        "tipe": "tips", "target_tipe": "desa", "muatan": {"isi": "v1"},
    })
    await app.kontribusi.transisi(aktor_pokdarwis(), DESA_A, k.id, "minta_revisi", "perbaiki")
    await app.kontribusi.revisi(aktor_warga(), DESA_A, k.id, {"isi": "v2"})
    hasil = await app.kontribusi.transisi(aktor_warga(), DESA_A, k.id, "ajukan")
    assert hasil.status == "menunggu"


@pytest.mark.asyncio
async def test_kontribusi_antrean_butuh_pengelola(app):
    with pytest.raises(TidakBerwenang):
        await app.kontribusi.antrean(aktor_warga(), DESA_A)


@pytest.mark.asyncio
async def test_kontribusi_foto_wajib_media(app):
    from kiluan_f1.errors import ValidasiGagal
    with pytest.raises(ValidasiGagal):
        await app.kontribusi.kirim(aktor_warga(), DESA_A, {
            "tipe": "foto", "target_tipe": "desa", "muatan": {},
        })

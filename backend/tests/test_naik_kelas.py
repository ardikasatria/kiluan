"""Gerbang kontrak F1 §7 — Naik Kelas Lestari (port dari scaffold kiluan_f1)."""
from __future__ import annotations

from uuid import uuid4

import pytest
import pytest_asyncio

from app.domain.enums import KodePeran
from app.domain.errors import KesalahanValidasi, Konflik, TidakBerwenang
from app.domain.seed_f1 import isi_semua_f1
from app.layanan.naik_kelas import NaikKelasLayanan
from app.layanan.pasar_desa import PasarDesaLayanan
from tests.conftest import beri_peran, buat_pengguna, konteks_untuk


@pytest_asyncio.fixture
async def naik_kelas(store, desa):
    await isi_semua_f1(store)
    return NaikKelasLayanan(store)


@pytest_asyncio.fixture
async def pasar(store, desa):
    await isi_semua_f1(store)
    return PasarDesaLayanan(store)


async def _buat_umkm_terverifikasi(pasar_svc, store, desa):
    umkm_user = await buat_pengguna(store, email="umkm-naik@contoh.id")
    await beri_peran(store, umkm_user.id, KodePeran.umkm, desa.id)
    pokdarwis = await buat_pengguna(store, email="pok-naik@contoh.id")
    await beri_peran(store, pokdarwis.id, KodePeran.pokdarwis, desa.id)
    k_umkm = await konteks_untuk(store, umkm_user.id)
    k_pok = await konteks_untuk(store, pokdarwis.id)
    umkm = await pasar_svc.daftar_umkm(k_umkm, desa.id, {"bidang_id": 1, "nama": "UMKM Naik Kelas"})
    await pasar_svc.verifikasi_umkm(k_pok, desa.id, umkm.id, "terverifikasi")
    return k_umkm, k_pok, umkm


@pytest.mark.asyncio
async def test_validasi_menaikkan_skor_dan_tingkat(naik_kelas, pasar, store, desa):
    k_umkm, k_pok, umkm = await _buat_umkm_terverifikasi(pasar, store, desa)
    kartu = (await store.kartu_aksi.semua())[0]
    p = await naik_kelas.ajukan(k_umkm, desa.id, {
        "subjek_tipe": "umkm", "subjek_id": umkm.id, "kartu_id": kartu.id,
        "bukti": {"foto_media_id": str(uuid4()), "pernyataan": "Kami memilah sampah."},
    })
    await naik_kelas.transisi(k_pok, desa.id, p.id, "setuju")
    sert = await naik_kelas.ambil_sertifikasi(desa.id, "umkm", umkm.id)
    assert sert is not None
    assert sert["skor"] >= kartu.bobot
    assert sert["tingkat"] in ("tunas", "bahari", "lumba_lumba")


@pytest.mark.asyncio
async def test_bukti_tak_lengkap_ditolak(naik_kelas, pasar, store, desa):
    k_umkm, _, umkm = await _buat_umkm_terverifikasi(pasar, store, desa)
    kartu = (await store.kartu_aksi.semua())[0]
    with pytest.raises(KesalahanValidasi):
        await naik_kelas.ajukan(k_umkm, desa.id, {
            "subjek_tipe": "umkm", "subjek_id": umkm.id, "kartu_id": kartu.id,
            "bukti": {"pernyataan": "tanpa foto"},
        })


@pytest.mark.asyncio
async def test_kartu_sama_dihitung_sekali(naik_kelas, pasar, store, desa):
    k_umkm, k_pok, umkm = await _buat_umkm_terverifikasi(pasar, store, desa)
    kartu = (await store.kartu_aksi.semua())[0]
    bukti = {"foto_media_id": str(uuid4()), "pernyataan": "Kami memilah sampah."}
    p1 = await naik_kelas.ajukan(k_umkm, desa.id, {
        "subjek_tipe": "umkm", "subjek_id": umkm.id, "kartu_id": kartu.id, "bukti": bukti,
    })
    await naik_kelas.transisi(k_pok, desa.id, p1.id, "setuju")
    with pytest.raises(Konflik):
        await naik_kelas.ajukan(k_umkm, desa.id, {
            "subjek_tipe": "umkm", "subjek_id": umkm.id, "kartu_id": kartu.id, "bukti": bukti,
        })
    sert = await naik_kelas.ambil_sertifikasi(desa.id, "umkm", umkm.id)
    assert sert["skor"] == kartu.bobot


@pytest.mark.asyncio
async def test_validasi_butuh_pengelola(naik_kelas, pasar, store, desa):
    k_umkm, _, umkm = await _buat_umkm_terverifikasi(pasar, store, desa)
    kartu = (await store.kartu_aksi.semua())[0]
    p = await naik_kelas.ajukan(k_umkm, desa.id, {
        "subjek_tipe": "umkm", "subjek_id": umkm.id, "kartu_id": kartu.id,
        "bukti": {"foto_media_id": str(uuid4()), "pernyataan": "ok"},
    })
    with pytest.raises(TidakBerwenang):
        await naik_kelas.transisi(k_umkm, desa.id, p.id, "setuju")


@pytest.mark.asyncio
async def test_ranking_pasar_desa_urut_tingkat(naik_kelas, pasar, store, desa):
    k_umkm, k_pok, u1 = await _buat_umkm_terverifikasi(pasar, store, desa)
    user2 = await buat_pengguna(store, email="umkm2-naik@contoh.id")
    await beri_peran(store, user2.id, KodePeran.umkm, desa.id)
    k_umkm2 = await konteks_untuk(store, user2.id)
    u2 = await pasar.daftar_umkm(k_umkm2, desa.id, {"bidang_id": 1, "nama": "UMKM B"})
    await pasar.verifikasi_umkm(k_pok, desa.id, u2.id, "terverifikasi")

    kartu_list = await store.kartu_aksi.semua()
    for umkm, kartu_ids in [(u2, [0, 1, 2, 3]), (u1, [0])]:
        aktor = k_umkm2 if umkm.id == u2.id else k_umkm
        for kid in kartu_ids:
            k = kartu_list[kid]
            p = await naik_kelas.ajukan(aktor, desa.id, {
                "subjek_tipe": "umkm", "subjek_id": umkm.id, "kartu_id": k.id,
                "bukti": {"foto_media_id": str(uuid4()), "pernyataan": "ok"},
            })
            await naik_kelas.transisi(k_pok, desa.id, p.id, "setuju")

    hal = await pasar.daftar_umkm_publik(desa.id)
    assert hal["item"][0]["id"] == str(u2.id)

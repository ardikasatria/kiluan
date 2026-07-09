"""Gerbang kontrak §10 — Naik Kelas Lestari."""
from __future__ import annotations

import pytest

from kiluan_f1.errors import ValidasiGagal
from kiluan_f1.ids import uid
from tests.conftest import DESA_A, USER_UMKM, aktor_pokdarwis, aktor_umkm, buat_umkm_terverifikasi


@pytest.mark.asyncio
async def test_validasi_menaikkan_skor_dan_tingkat(app):
    aktor, umkm = await buat_umkm_terverifikasi(app)
    kartu = (await app.repo_kartu.semua())[0]
    p = await app.pengajuan_kartu.ajukan(aktor, DESA_A, {
        "subjek_tipe": "umkm", "subjek_id": umkm.id, "kartu_id": kartu.id,
        "bukti": {"foto_media_id": str(uid()), "pernyataan": "Kami memilah sampah."},
    })
    await app.pengajuan_kartu.transisi(aktor_pokdarwis(), DESA_A, p.id, "setuju")
    sert = await app.sertifikasi.ambil(DESA_A, "umkm", umkm.id)
    assert sert is not None
    assert sert.skor >= kartu.bobot
    assert sert.tingkat in ("tunas", "bahari", "lumba_lumba")


@pytest.mark.asyncio
async def test_bukti_tak_lengkap_ditolak(app):
    aktor, umkm = await buat_umkm_terverifikasi(app)
    kartu = (await app.repo_kartu.semua())[0]
    with pytest.raises(ValidasiGagal):
        await app.pengajuan_kartu.ajukan(aktor, DESA_A, {
            "subjek_tipe": "umkm", "subjek_id": umkm.id, "kartu_id": kartu.id,
            "bukti": {"pernyataan": "tanpa foto"},
        })


@pytest.mark.asyncio
async def test_kartu_sama_dihitung_sekali(app):
    aktor, umkm = await buat_umkm_terverifikasi(app)
    kartu = (await app.repo_kartu.semua())[0]
    bukti = {"foto_media_id": str(uid()), "pernyataan": "Kami memilah sampah."}
    p1 = await app.pengajuan_kartu.ajukan(aktor, DESA_A, {
        "subjek_tipe": "umkm", "subjek_id": umkm.id, "kartu_id": kartu.id, "bukti": bukti,
    })
    await app.pengajuan_kartu.transisi(aktor_pokdarwis(), DESA_A, p1.id, "setuju")
    p2 = await app.pengajuan_kartu.ajukan(aktor, DESA_A, {
        "subjek_tipe": "umkm", "subjek_id": umkm.id, "kartu_id": kartu.id, "bukti": bukti,
    })
    await app.pengajuan_kartu.transisi(aktor_pokdarwis(), DESA_A, p2.id, "setuju")
    sert = await app.sertifikasi.ambil(DESA_A, "umkm", umkm.id)
    assert sert.skor == kartu.bobot


@pytest.mark.asyncio
async def test_ranking_pasar_desa_urut_tingkat(app):
    """UMKM dengan sertifikasi lebih tinggi muncul lebih dulu."""
    from kiluan_f1.konteks import Aktor, PeranAktif

    aktor1 = Aktor(USER_UMKM, [PeranAktif(DESA_A, "umkm")])
    u1 = await app.umkm.daftar(aktor1, DESA_A, {"bidang_id": 1, "nama": "UMKM A"})
    await app.umkm.verifikasi(aktor_pokdarwis(), DESA_A, u1.id, "terverifikasi")

    user2 = uid()
    aktor2 = Aktor(user2, [PeranAktif(DESA_A, "umkm")])
    u2 = await app.umkm.daftar(aktor2, DESA_A, {"bidang_id": 1, "nama": "UMKM B"})
    await app.umkm.verifikasi(aktor_pokdarwis(), DESA_A, u2.id, "terverifikasi")

    kartu_list = await app.repo_kartu.semua()
    for umkm, kartu_ids in [(u2, [0, 1, 2, 3]), (u1, [0])]:
        aktor = aktor2 if umkm.id == u2.id else aktor1
        for kid in kartu_ids:
            k = kartu_list[kid]
            p = await app.pengajuan_kartu.ajukan(aktor, DESA_A, {
                "subjek_tipe": "umkm", "subjek_id": umkm.id, "kartu_id": k.id,
                "bukti": {"foto_media_id": str(uid()), "pernyataan": "ok"},
            })
            await app.pengajuan_kartu.transisi(aktor_pokdarwis(), DESA_A, p.id, "setuju")

    hal = await app.umkm.daftar_publik(DESA_A)
    assert hal.item[0].id == u2.id

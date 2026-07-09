"""Gerbang kontrak §10 — Lencana Warga."""
from __future__ import annotations

import pytest

from kiluan_f1.ids import urut
from kiluan_f1.models import TransaksiPoin
from tests.conftest import DESA_A, DESA_B, USER_WARGA, aktor_warga, buat_umkm_terverifikasi


@pytest.mark.asyncio
async def test_badge_poin_min_ter_award(app):
    await app.poin.award(DESA_A, USER_WARGA, "kontribusi_disetujui", "kontribusi", urut())
    await app.poin.award(DESA_A, USER_WARGA, "kontribusi_disetujui", "kontribusi", urut())
    milik = await app.badge.milik(USER_WARGA)
    kode = {b.badge_id for b in milik}
    assert 1 in kode  # badge Penjelajah (poin_min 20)


@pytest.mark.asyncio
async def test_badge_aksi_jumlah_dan_tak_ganda(app):
    for i in range(10):
        await app.poin.award(DESA_A, USER_WARGA, "kontribusi_disetujui", "kontribusi", urut())
    milik = await app.badge.milik(USER_WARGA)
    badge_ids = [b.badge_id for b in milik]
    assert badge_ids.count(2) == 1  # Kurator Warga


@pytest.mark.asyncio
async def test_saldo_poin_terpisah_per_desa(app):
    await app.poin.award(DESA_A, USER_WARGA, "kontribusi_disetujui", "kontribusi", urut())
    await app.poin.award(DESA_B, USER_WARGA, "kontribusi_disetujui", "kontribusi", urut())
    assert await app.poin.saldo(DESA_A, USER_WARGA) == 20
    assert await app.poin.saldo(DESA_B, USER_WARGA) == 20


@pytest.mark.asyncio
async def test_leaderboard_agregat(app):
    await app.poin.award(DESA_A, USER_WARGA, "kontribusi_disetujui", "kontribusi", urut())
    await app.poin.award(DESA_A, USER_WARGA, "produk_terdaftar", "produk_jasa", urut())
    papan = await app.poin.leaderboard(DESA_A)
    assert papan[0]["poin"] == 30


@pytest.mark.asyncio
async def test_keyset_stabil_saat_ditambah(app):
    """Keyset stabil saat baris ditambah di tengah iterasi."""
    for i in range(5):
        await app.repo_transaksi_poin.simpan(TransaksiPoin(
            desa_id=DESA_A, pengguna_id=USER_WARGA,
            kode_aksi="kontribusi_disetujui", poin=1, urut=i + 1,
        ))
    hal1 = await app.poin.riwayat(DESA_A, USER_WARGA, batas=2)
    ids_hal1 = {t.id for t in hal1.item}
    await app.repo_transaksi_poin.simpan(TransaksiPoin(
        desa_id=DESA_A, pengguna_id=USER_WARGA,
        kode_aksi="kontribusi_disetujui", poin=99, urut=3,
    ))
    hal2 = await app.poin.riwayat(DESA_A, USER_WARGA, kursor=hal1.kursor_berikutnya, batas=2)
    for t in hal2.item:
        assert t.id not in ids_hal1

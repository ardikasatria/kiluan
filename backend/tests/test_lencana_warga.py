"""Gerbang kontrak F1 §5 — Lencana Warga (port dari scaffold kiluan_f1)."""
from __future__ import annotations

from uuid import uuid4

import pytest
import pytest_asyncio

from app.domain.seed_f1 import isi_lencana
from app.domain.util import uid
from app.layanan.lencana_warga import LencanaLayanan
from tests.conftest import buat_pengguna, desa


@pytest_asyncio.fixture
async def lencana(store, desa):
    await isi_lencana(store)
    return LencanaLayanan(store)


@pytest.mark.asyncio
async def test_award_idempoten(lencana, store, desa):
    p = await buat_pengguna(store, email="poin@contoh.id")
    ref = uid()
    assert await lencana.award(desa.id, p.id, "kontribusi_disetujui", "kontribusi", ref)
    assert not await lencana.award(desa.id, p.id, "kontribusi_disetujui", "kontribusi", ref)
    assert await lencana.saldo(desa.id, p.id) == 20


@pytest.mark.asyncio
async def test_badge_poin_min_ter_award(lencana, desa):
    p = await buat_pengguna(store := lencana.store, email="badge1@contoh.id")
    await lencana.award(desa.id, p.id, "kontribusi_disetujui", "kontribusi", uid())
    milik = await lencana.badge_saya(desa.id, p.id)
    assert any(b["kode"] == "penjelajah" for b in milik)


@pytest.mark.asyncio
async def test_badge_tidak_ganda(lencana, desa):
    p = await buat_pengguna(lencana.store, email="badge2@contoh.id")
    ref = uid()
    await lencana.award(desa.id, p.id, "kontribusi_disetujui", "kontribusi", ref)
    await lencana.award(desa.id, p.id, "kontribusi_disetujui", "kontribusi", ref)
    milik = await lencana.badge_saya(desa.id, p.id)
    assert sum(1 for b in milik if b["kode"] == "penjelajah") == 1


@pytest.mark.asyncio
async def test_saldo_terpisah_per_desa(lencana, store, desa, desa_lain):
    p = await buat_pengguna(store, email="saldo@contoh.id")
    await lencana.award(desa.id, p.id, "kontribusi_disetujui", "kontribusi", uid())
    await lencana.award(desa_lain.id, p.id, "kontribusi_disetujui", "kontribusi", uid())
    assert await lencana.saldo(desa.id, p.id) == 20
    assert await lencana.saldo(desa_lain.id, p.id) == 20


@pytest.mark.asyncio
async def test_leaderboard_agregat(lencana, desa):
    p = await buat_pengguna(lencana.store, email="lb@contoh.id")
    await lencana.award(desa.id, p.id, "kontribusi_disetujui", "kontribusi", uid())
    await lencana.award(desa.id, p.id, "produk_terdaftar", "produk_jasa", uid())
    papan = await lencana.leaderboard(desa.id)
    assert papan[0]["poin"] == 30


@pytest.mark.asyncio
async def test_keyset_riwayat(lencana, desa):
    p = await buat_pengguna(lencana.store, email="keyset@contoh.id")
    for _ in range(5):
        await lencana.award(desa.id, p.id, "kontribusi_disetujui", "kontribusi", uid())
    hal1 = await lencana.poin_saya(desa.id, p.id, batas=2)
    assert len(hal1["riwayat"]) == 2
    assert hal1["meta"]["ada_lagi"] is True
    hal2 = await lencana.poin_saya(desa.id, p.id, kursor=hal1["meta"]["kursor_berikutnya"], batas=2)
    ids1 = {r["referensi_id"] for r in hal1["riwayat"]}
    for r in hal2["riwayat"]:
        assert r["referensi_id"] not in ids1


@pytest.mark.asyncio
async def test_bidang_usaha_lookup(lencana):
    item = await lencana.daftar_bidang_usaha()
    assert len(item) >= 5
    assert any(b["kode"] == "kuliner" for b in item)

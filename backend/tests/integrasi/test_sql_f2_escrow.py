"""Integrasi escrow F2 — CHECK split transaksi di Postgres."""
from __future__ import annotations

import os
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError

from app.model import tabel as M
from tests.integrasi.f2_bantu import seed_dermaga_e2e

TEST_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="TEST_DATABASE_URL tidak diset")


@pytest.mark.asyncio
async def test_ck_transaksi_split_menolak_baris_tidak_seimbang(sesi):
    seed = await seed_dermaga_e2e(sesi)
    pid = uuid4()
    sesi.add(M.Pesanan(
        id=pid, desa_id=seed.desa_id, pembeli_id=seed.wisatawan.pengguna_id,
        kode_pesanan="E2E-SPLIT", status="dibayar", total=Decimal("100000"),
    ))
    await sesi.flush()

    sesi.add(M.Transaksi(
        id=uuid4(), desa_id=seed.desa_id, pesanan_id=pid,
        penyedia_tipe="pengguna", penyedia_id=seed.agen_id, jenis="penjualan",
        bruto=Decimal("100000"), fee_platform=Decimal("2000"),
        porsi_reinvestasi=Decimal("10000"), neto_penyedia=Decimal("88001"),
        status="tertahan_escrow",
    ))
    with pytest.raises(IntegrityError):
        await sesi.flush()


@pytest.mark.asyncio
async def test_settle_membuat_split_seimbang(sesi):
    from app.layanan.dermaga import DermagaLayanan

    from tests.integrasi.f2_bantu import spec_paket

    seed = await seed_dermaga_e2e(sesi)
    dermaga = DermagaLayanan(seed.store)
    pesanan, _ = await dermaga.checkout(
        seed.wisatawan, seed.desa_id, spec_paket(seed.paket_id, seed.slot_id),
        idempotency_key="split-co",
    )
    bayar = await dermaga.buat_pembayaran(
        seed.wisatawan, seed.desa_id, pesanan.id, "manual", idempotency_key="split-b",
    )
    await dermaga.konfirmasi_manual(
        seed.bendahara, seed.desa_id, bayar.id, idempotency_key="split-k",
    )
    await sesi.commit()

    for t in await dermaga.transaksi.daftar_pesanan(pesanan.id):
        assert t.bruto == t.fee_platform + t.porsi_reinvestasi + t.neto_penyedia

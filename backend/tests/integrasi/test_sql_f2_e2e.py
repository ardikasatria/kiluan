"""E2E thin-slice F2 di Postgres: checkout → bayar manual → check-in → rilis → payout."""
from __future__ import annotations

import os

import pytest
from sqlalchemy import select

from app.layanan.dermaga import DermagaLayanan
from app.layanan.uang import UangLayanan
from app.model import tabel as M
from tests.integrasi.f2_bantu import seed_dermaga_e2e, spec_paket

TEST_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="TEST_DATABASE_URL tidak diset")


@pytest.mark.asyncio
async def test_alur_pesanan_manual_hingga_payout(sesi):
    seed = await seed_dermaga_e2e(sesi)
    dermaga = DermagaLayanan(seed.store)
    uang = UangLayanan(seed.store)

    pesanan = await dermaga.checkout(
        seed.wisatawan, seed.desa_id, spec_paket(seed.paket_id, seed.slot_id),
        idempotency_key="e2e-co",
    )
    bayar = await dermaga.buat_pembayaran(
        seed.wisatawan, seed.desa_id, pesanan.id, "manual", idempotency_key="e2e-bayar",
    )
    await dermaga.konfirmasi_manual(
        seed.bendahara, seed.desa_id, bayar.id, idempotency_key="e2e-konf",
    )
    await sesi.commit()
    await sesi.refresh(pesanan)
    await sesi.refresh(bayar)

    assert pesanan.status == "dibayar"
    assert bayar.status == "berhasil"

    transaksi = await dermaga.transaksi.daftar_pesanan(pesanan.id)
    assert len(transaksi) == 1
    t = transaksi[0]
    assert t.bruto == t.fee_platform + t.porsi_reinvestasi + t.neto_penyedia
    assert t.status == "tertahan_escrow"

    bookings = await dermaga.booking.daftar(seed.desa_id, status="terkonfirmasi")
    assert len(bookings) == 1
    await dermaga.checkin(seed.bendahara, seed.desa_id, bookings[0].id)
    await dermaga.selesaikan_pesanan(seed.desa_id, pesanan.id)
    await sesi.commit()

    transaksi = await dermaga.transaksi.daftar_pesanan(pesanan.id)
    assert all(x.status == "dirilis" for x in transaksi)
    assert pesanan.status == "selesai"

    rek = await uang.buat_rekening(seed.agen, seed.desa_id, {
        "penyedia_tipe": "pengguna",
        "penyedia_id": str(seed.agen_id),
        "jenis": "bank",
        "bank_kode": "014",
        "nomor": "9876543210",
        "nama_pemilik": "Agen E2E",
    })
    await uang.verifikasi_rekening(seed.bendahara, seed.desa_id, rek.id, True)
    payout = await uang.buat_payout(
        seed.bendahara, seed.desa_id, "pengguna", seed.agen_id, rek.id,
        idempotency_key="e2e-payout",
    )
    await uang.transisi_payout(seed.bendahara, seed.desa_id, payout.id, "tandai_berhasil")
    await sesi.commit()
    await sesi.refresh(payout)

    assert payout.status == "berhasil"
    assert payout.jumlah == transaksi[0].neto_penyedia


@pytest.mark.asyncio
async def test_webhook_idempoten_tidak_gandakan_transaksi(sesi):
    from app.layanan.dermaga import DermagaLayanan

    seed = await seed_dermaga_e2e(sesi)
    dermaga = DermagaLayanan(seed.store)
    pesanan = await dermaga.checkout(
        seed.wisatawan, seed.desa_id, spec_paket(seed.paket_id, seed.slot_id),
        idempotency_key="wh-co",
    )
    bayar = await dermaga.buat_pembayaran(
        seed.wisatawan, seed.desa_id, pesanan.id, "manual", idempotency_key="wh-bayar",
    )
    await sesi.commit()

    event = {
        "event_id": "evt-e2e-1",
        "ref_eksternal": bayar.ref_eksternal,
        "jenis_event": "berhasil",
        "signature": "uji",
    }
    await dermaga.proses_webhook("manual", event)
    await dermaga.proses_webhook("manual", event)
    await sesi.commit()

    res = await sesi.execute(
        select(M.Transaksi).where(M.Transaksi.pesanan_id == pesanan.id)
    )
    rows = list(res.scalars().all())
    assert len(rows) == 1

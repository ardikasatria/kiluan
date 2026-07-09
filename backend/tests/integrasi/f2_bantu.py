"""Seed data untuk uji integrasi F2 (Dermaga + Penjelajah)."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import entitas as E
from app.domain.enums import KodePeran, StatusDesa, StatusKeanggotaan, StatusPengguna
from app.domain.keamanan import hash_sandi
from app.domain.konteks import Konteks, bangun_konteks
from app.model import tabel as M
from app.repo.sql import Penyimpanan


@dataclass
class SeedE2E:
    store: Penyimpanan
    desa_id: UUID
    wisatawan: Konteks
    bendahara: Konteks
    agen: Konteks
    agen_id: UUID
    paket_id: UUID
    slot_id: UUID


async def seed_dermaga_e2e(sesi: AsyncSession) -> SeedE2E:
    store = Penyimpanan(sesi)
    d = await store.desa.tambah(E.Desa(slug="e2e-f2", nama="E2E F2", status=StatusDesa.aktif))

    w = await store.pengguna.tambah(
        E.Pengguna(email="w@e2e.id", nama="Wisatawan", kata_sandi_hash=hash_sandi("x"), status=StatusPengguna.aktif)
    )
    b = await store.pengguna.tambah(
        E.Pengguna(email="b@e2e.id", nama="Bendahara", kata_sandi_hash=hash_sandi("x"), status=StatusPengguna.aktif)
    )
    a = await store.pengguna.tambah(
        E.Pengguna(email="a@e2e.id", nama="Agen", kata_sandi_hash=hash_sandi("x"), status=StatusPengguna.aktif)
    )
    await store.keanggotaan.tambah(E.Keanggotaan(pengguna_id=w.id, peran=KodePeran.wisatawan, desa_id=d.id, status=StatusKeanggotaan.aktif))
    await store.keanggotaan.tambah(E.Keanggotaan(pengguna_id=b.id, peran=KodePeran.pokdarwis, desa_id=d.id, status=StatusKeanggotaan.aktif))
    await store.keanggotaan.tambah(E.Keanggotaan(pengguna_id=a.id, peran=KodePeran.agen, desa_id=d.id, status=StatusKeanggotaan.aktif))

    sesi.add(M.PengaturanDesa(
        desa_id=d.id,
        persen_reinvestasi=Decimal("0.10"),
        persen_fee_platform=Decimal("0.02"),
        batas_hold_menit=30,
        gateway="manual",
    ))
    paket_id = uuid4()
    sesi.add(M.PaketWisata(
        id=paket_id, desa_id=d.id, agen_id=a.id, slug="lumba-e2e", nama="Trip Lumba E2E",
        durasi_jam=4, harga=Decimal("300000"), satuan_harga="per_paket", kuota_default=10, status="publikasi",
    ))
    slot_id = uuid4()
    sesi.add(M.SlotJadwal(
        id=slot_id, desa_id=d.id, subjek_tipe="paket_wisata", subjek_id=paket_id,
        tanggal=date.today() + timedelta(days=14), kuota=4, kuota_terpakai=0,
        harga_override=Decimal("300000"), status="buka",
    ))
    await sesi.flush()

    return SeedE2E(
        store=store,
        desa_id=d.id,
        wisatawan=await bangun_konteks(store, w.id),
        bendahara=await bangun_konteks(store, b.id),
        agen=await bangun_konteks(store, a.id),
        agen_id=a.id,
        paket_id=paket_id,
        slot_id=slot_id,
    )


def spec_paket(paket_id: UUID, slot_id: UUID) -> dict:
    return {
        "item": [{
            "item_tipe": "paket_wisata",
            "item_id": str(paket_id),
            "slot_jadwal_id": str(slot_id),
            "jumlah": 1,
            "metadata": {"jumlah_orang": 2},
        }],
        "kontak": {"nama": "E2E"},
    }

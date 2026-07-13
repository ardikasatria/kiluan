"""Integrasi Dermaga F2 — anti-overbook FOR UPDATE di Postgres."""
from __future__ import annotations

import asyncio
import os
from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
import pytest_asyncio

TEST_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="TEST_DATABASE_URL tidak diset")


@pytest_asyncio.fixture
async def sesi():
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.model.tabel import Base

    engine = create_async_engine(TEST_URL, future=True)
    async with engine.begin() as c:
        await c.run_sync(Base.metadata.drop_all)
        await c.run_sync(Base.metadata.create_all)
    Maker = async_sessionmaker(engine, expire_on_commit=False)
    async with Maker() as s:
        yield s
    await engine.dispose()


async def _seed_checkout(sesi):
    from app.domain import entitas as E
    from app.domain.enums import JenisProduk, KodePeran, SatuanHarga, StatusDesa, StatusKeanggotaan, StatusPengguna, StatusProduk
    from app.domain.keamanan import hash_sandi
    from app.domain.konteks import bangun_konteks
    from app.model import tabel as M
    from app.repo.sql import Penyimpanan

    store = Penyimpanan(sesi)
    d = await store.desa.tambah(E.Desa(slug="uji-f2", nama="Uji F2", status=StatusDesa.aktif))
    w1 = await store.pengguna.tambah(
        E.Pengguna(email="w1@contoh.id", nama="W1", kata_sandi_hash=hash_sandi("x"), status=StatusPengguna.aktif)
    )
    w2 = await store.pengguna.tambah(
        E.Pengguna(email="w2@contoh.id", nama="W2", kata_sandi_hash=hash_sandi("x"), status=StatusPengguna.aktif)
    )
    await store.keanggotaan.tambah(E.Keanggotaan(pengguna_id=w1.id, peran=KodePeran.wisatawan, desa_id=d.id, status=StatusKeanggotaan.aktif))
    await store.keanggotaan.tambah(E.Keanggotaan(pengguna_id=w2.id, peran=KodePeran.wisatawan, desa_id=d.id, status=StatusKeanggotaan.aktif))
    agen = await store.pengguna.tambah(
        E.Pengguna(email="agen@contoh.id", nama="Agen", kata_sandi_hash=hash_sandi("x"), status=StatusPengguna.aktif)
    )
    sesi.add(M.PengaturanDesa(desa_id=d.id, persen_reinvestasi=Decimal("0.10"), persen_fee_platform=Decimal("0.02")))
    # UMKM + produk
    sesi.add(M.BidangUsaha(id=1, kode="kuliner", nama="Kuliner"))
    umkm_id = uuid4()
    sesi.add(M.Umkm(id=umkm_id, desa_id=d.id, pengguna_id=agen.id, bidang_id=1, nama="UMKM", status_verifikasi="terverifikasi"))
    paket_id = uuid4()
    sesi.add(M.PaketWisata(
        id=paket_id, desa_id=d.id, agen_id=agen.id, slug="lumba", nama="Trip Lumba",
        durasi_jam=4, harga=300000, satuan_harga="per_paket", kuota_default=10, status="publikasi",
    ))
    slot = M.SlotJadwal(
        id=uuid4(), desa_id=d.id, subjek_tipe="paket_wisata", subjek_id=paket_id,
        tanggal=date.today() + timedelta(days=7), kuota=1, kuota_terpakai=0, status="buka",
        harga_override=Decimal("300000"),
    )
    sesi.add(slot)
    await sesi.flush()
    k1 = await bangun_konteks(store, w1.id)
    k2 = await bangun_konteks(store, w2.id)
    return store, d, slot, paket_id, k1, k2


def _spec_paket(paket_id, slot_id):
    return {
        "item": [{
            "item_tipe": "paket_wisata", "item_id": str(paket_id),
            "slot_jadwal_id": str(slot_id), "jumlah": 1,
            "metadata": {"jumlah_orang": 2},
        }],
        "kontak": {"nama": "Uji"},
    }


@pytest.mark.asyncio
async def test_race_overbook_sql(sesi):
    from app.domain.errors import SlotPenuh
    from app.layanan.dermaga import DermagaLayanan

    store, d, slot, paket_id, k1, k2 = await _seed_checkout(sesi)
    svc = DermagaLayanan(store)
    spec = _spec_paket(paket_id, slot.id)

    async def _checkout(konteks, key):
        pesanan, _ = await svc.checkout(konteks, d.id, spec, idempotency_key=key)
        return pesanan

    hasil = await asyncio.gather(
        _checkout(k1, "k1"),
        _checkout(k2, "k2"),
        return_exceptions=True,
    )
    sukses = [h for h in hasil if not isinstance(h, Exception)]
    gagal = [h for h in hasil if isinstance(h, SlotPenuh)]
    assert len(sukses) == 1 and len(gagal) == 1
    await sesi.refresh(slot)
    assert slot.kuota_terpakai <= slot.kuota == 1

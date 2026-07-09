"""Integrasi Lencana Warga — award idempoten di Postgres (ON CONFLICT)."""
from __future__ import annotations

import os
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


async def _seed_desa_pengguna(sesi):
    from app.domain import entitas as E
    from app.domain.enums import StatusDesa
    from app.domain.keamanan import hash_sandi
    from app.model import tabel as M
    from app.repo.sql import Penyimpanan

    store = Penyimpanan(sesi)
    d = await store.desa.tambah(E.Desa(slug="uji", nama="Uji", status=StatusDesa.aktif))
    p = await store.pengguna.tambah(
        E.Pengguna(email="lencana@contoh.id", nama="Lencana", kata_sandi_hash=hash_sandi("x"))
    )
    for kode, nama, ikon in [
        ("kuliner", "Kuliner", "🍲"),
        ("kerajinan", "Kerajinan", "🧺"),
    ]:
        sesi.add(M.BidangUsaha(kode=kode, nama=nama, ikon=ikon))
    for kode, poin, desk in [
        ("kontribusi_disetujui", 20, "Kontribusi disetujui"),
        ("produk_terdaftar", 10, "Produk terdaftar"),
    ]:
        sesi.add(M.AturanPoin(kode_aksi=kode, poin=poin, deskripsi=desk, desa_id=None, aktif=True))
    sesi.add(M.Badge(
        kode="penjelajah", nama="Penjelajah", deskripsi="x", ikon="🧭",
        tingkat=1, syarat={"poin_min": 20}, desa_id=None, aktif=True,
    ))
    await sesi.flush()
    return store, d, p


@pytest.mark.asyncio
async def test_award_sql_idempoten(sesi):
    from app.layanan.lencana_warga import LencanaLayanan

    store, d, p = await _seed_desa_pengguna(sesi)
    svc = LencanaLayanan(store)
    ref = uuid4()
    assert await svc.award(d.id, p.id, "kontribusi_disetujui", "kontribusi", ref)
    assert not await svc.award(d.id, p.id, "kontribusi_disetujui", "kontribusi", ref)
    await sesi.commit()
    rows = await store.transaksi_poin.cari(pengguna_id=p.id, kode_aksi="kontribusi_disetujui")
    assert len(rows) == 1


@pytest.mark.asyncio
async def test_badge_sql_idempoten(sesi):
    from app.layanan.lencana_warga import LencanaLayanan

    store, d, p = await _seed_desa_pengguna(sesi)
    svc = LencanaLayanan(store)
    await svc.award(d.id, p.id, "kontribusi_disetujui", "kontribusi", uuid4())
    await svc.award(d.id, p.id, "kontribusi_disetujui", "kontribusi", uuid4())
    await sesi.commit()
    milik = await svc.badge_saya(d.id, p.id)
    assert sum(1 for b in milik if b["kode"] == "penjelajah") == 1

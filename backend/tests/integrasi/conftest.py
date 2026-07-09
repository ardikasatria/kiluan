"""Fixture & seed bersama untuk integrasi Postgres/PostGIS F2."""
from __future__ import annotations

import os

import pytest
import pytest_asyncio
from sqlalchemy import text

TEST_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="TEST_DATABASE_URL tidak diset")


@pytest_asyncio.fixture
async def sesi():
    if not TEST_URL:
        pytest.skip("TEST_DATABASE_URL tidak diset")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.model.tabel import Base

    engine = create_async_engine(TEST_URL, future=True)
    async with engine.begin() as c:
        await c.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await c.run_sync(Base.metadata.drop_all)
        await c.run_sync(Base.metadata.create_all)
    Maker = async_sessionmaker(engine, expire_on_commit=False)
    async with Maker() as s:
        await seed_lookup(s)
        await s.commit()
        yield s
    await engine.dispose()


async def seed_lookup(sesi) -> None:
    """Baris lookup minimal (peran, bidang) agar FK integrasi valid."""
    from app.model import tabel as M

    for pid, kode in M.ID_PERAN.items():
        sesi.add(M.Peran(id=pid, kode=kode, nama=kode.replace("_", " ").title(), scoped_desa=True))
    if not sesi.get(M.BidangUsaha, 1):
        sesi.add(M.BidangUsaha(id=1, kode="kuliner", nama="Kuliner", ikon="🍲"))
    await sesi.flush()

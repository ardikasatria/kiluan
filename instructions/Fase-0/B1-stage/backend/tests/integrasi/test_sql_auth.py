"""Template test integrasi repo SQL (async) terhadap Postgres uji.

Jalankan hanya bila `TEST_DATABASE_URL` (asyncpg) diset, mis:
  TEST_DATABASE_URL=postgresql+asyncpg://kiluan:kiluan@localhost:5432/kiluan_test \
    pytest tests/integrasi -q

Membuktikan semantik yang TAK bisa diuji in-memory: mutasi lewat baris ORM
ter-persist (verifikasi email, rotasi refresh, cabut sesi), unik email/keanggotaan
→ Konflik, dan filter tenant di query nyata. Skema disiapkan via Base.metadata
(untuk uji cepat) — di CI sebaiknya `alembic upgrade head`.
"""
from __future__ import annotations

import os

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


async def test_siklus_auth_sql(sesi):
    from app.layanan.auth import AuthLayanan
    from app.repo.sql import Penyimpanan
    from app.skema.destinasi import DaftarReq, MasukReq

    store = Penyimpanan(sesi)
    auth = AuthLayanan(store)  # keamanan default (pbkdf2) cukup untuk uji repo

    p, token = await auth.daftar(DaftarReq(email="i@contoh.id", nama="I", kata_sandi="rahasia123"))
    await sesi.commit()
    await auth.verifikasi_email(token)     # mutasi status via ORM
    await sesi.commit()

    from app.domain.enums import StatusPengguna
    row = await store.pengguna.ambil(p.id)
    assert row.status == StatusPengguna.aktif   # persist terbukti

    sesi1 = await auth.masuk(MasukReq(email="i@contoh.id", kata_sandi="rahasia123"))
    await sesi.commit()
    baru = await auth.segarkan(sesi1["refresh_token"])
    await sesi.commit()
    with pytest.raises(Exception):
        await auth.segarkan(sesi1["refresh_token"])  # reuse → dicabut

"""Engine & session async SQLAlchemy (runtime app).

Migrasi Alembic memakai engine SINKRON terpisah (lihat alembic/env.py) sesuai
ADR-0003.
"""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .konfig import konfig

_engine = create_async_engine(konfig().DATABASE_URL, pool_pre_ping=True, future=True)
BuatSesi = async_sessionmaker(_engine, expire_on_commit=False, class_=AsyncSession)


async def sesi() -> AsyncSession:
    """Dependency FastAPI: yield satu AsyncSession per request."""
    async with BuatSesi() as s:
        yield s


async def cek_db() -> bool:
    from sqlalchemy import text

    async with _engine.connect() as c:
        await c.execute(text("SELECT 1"))
    return True

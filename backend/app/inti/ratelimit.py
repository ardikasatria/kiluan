"""Pembatas laju sederhana berbasis Redis (fixed-window).

Dipakai mis. pada /auth/masuk (5/menit/IP → 429). Client dibuat malas agar impor
modul tak butuh Redis hidup.
"""
from __future__ import annotations

import redis.asyncio as aioredis

from app.domain.errors import TerlaluBanyakPermintaan
from app.inti.konfig import konfig

_klien: aioredis.Redis | None = None


def _r() -> aioredis.Redis:
    global _klien
    if _klien is None:
        _klien = aioredis.from_url(konfig().REDIS_URL, decode_responses=True)
    return _klien


async def periksa_batas(kunci: str, batas: int, jendela_detik: int) -> None:
    r = _r()
    n = await r.incr(kunci)
    if n == 1:
        await r.expire(kunci, jendela_detik)
    if n > batas:
        raise TerlaluBanyakPermintaan("terlalu banyak permintaan, coba lagi nanti")

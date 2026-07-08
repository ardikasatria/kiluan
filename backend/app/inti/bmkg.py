"""Adapter cuaca BMKG — cache Redis, fail-soft, gated CUACA_AKTIF."""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

import redis.asyncio as aioredis

from app.inti.konfig import konfig

log = logging.getLogger("kiluan.bmkg")

_klien: aioredis.Redis | None = None


def _r() -> aioredis.Redis:
    global _klien
    if _klien is None:
        _klien = aioredis.from_url(konfig().REDIS_URL, decode_responses=True)
    return _klien


def _sekarang() -> str:
    return datetime.now(timezone.utc).isoformat()


def _tak_tersedia() -> dict[str, Any]:
    return {"status": "tak_tersedia"}


async def _cache_get(kunci: str) -> Optional[dict]:
    try:
        raw = await _r().get(kunci)
        return json.loads(raw) if raw else None
    except Exception:
        log.warning("cache cuaca gagal dibaca: %s", kunci, exc_info=True)
        return None


async def _cache_set(kunci: str, data: dict) -> None:
    try:
        await _r().setex(kunci, konfig().CUACA_CACHE_TTL_DETIK, json.dumps(data))
    except Exception:
        log.warning("cache cuaca gagal ditulis: %s", kunci, exc_info=True)


async def _ambil_darat(adm4: str) -> dict:
    kunci = f"cuaca:darat:{adm4}"
    cached = await _cache_get(kunci)
    if cached is not None:
        return cached

    try:
        import httpx

        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(
                "https://api.bmkg.go.id/publik/prakiraan-cuaca",
                params={"adm4": adm4},
            )
            r.raise_for_status()
            body = r.json()
        data = {
            "status": "ok",
            "prakiraan": body.get("data", body),
            "diperbarui": _sekarang(),
        }
        await _cache_set(kunci, data)
        return data
    except Exception:
        log.warning("BMKG darat gagal adm4=%s", adm4, exc_info=True)
        stale = await _cache_get(kunci)
        if stale:
            return stale
        return _tak_tersedia()


async def _ambil_maritim(kode: str) -> dict | None:
    if not kode:
        return None
    kunci = f"cuaca:maritim:{kode}"
    cached = await _cache_get(kunci)
    if cached is not None:
        return cached

    try:
        import httpx

        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get("https://peta-maritim.bmkg.go.id/public_api/perairan")
            r.raise_for_status()
            body = r.json()
        # Cari entri perairan yang cocok dengan kode desa.
        entri = None
        if isinstance(body, list):
            entri = next((x for x in body if x.get("code") == kode or x.get("kode") == kode), None)
        elif isinstance(body, dict):
            daftar = body.get("data") or body.get("features") or []
            entri = next(
                (x for x in daftar if x.get("code") == kode or x.get("kode") == kode),
                None,
            )
        data = {
            "status": "ok" if entri else "tak_tersedia",
            "perairan": entri,
            "kode": kode,
            "diperbarui": _sekarang(),
        }
        await _cache_set(kunci, data)
        return data
    except Exception:
        log.warning("BMKG maritim gagal kode=%s", kode, exc_info=True)
        stale = await _cache_get(kunci)
        return stale if stale else _tak_tersedia()


async def ambil_cuaca_desa(*, kode_bmkg_adm4: str | None, kode_perairan_bmkg: str | None) -> dict:
    """Gabungan cuaca darat + maritim untuk satu desa."""
    if not konfig().CUACA_AKTIF:
        return {
            "darat": _tak_tersedia(),
            "maritim": None,
            "sumber": "BMKG",
            "diperbarui": None,
        }

    darat = await _ambil_darat(kode_bmkg_adm4) if kode_bmkg_adm4 else _tak_tersedia()
    maritim = await _ambil_maritim(kode_perairan_bmkg) if kode_perairan_bmkg else None
    diperbarui = darat.get("diperbarui") or (maritim or {}).get("diperbarui")
    return {
        "darat": darat,
        "maritim": maritim,
        "sumber": "BMKG",
        "diperbarui": diperbarui,
    }

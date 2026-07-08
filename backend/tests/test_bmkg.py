"""Uji modul cuaca BMKG — cache, fail-soft, gate CUACA_AKTIF."""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest

from app.inti import bmkg
from app.inti.konfig import Konfig


@pytest.mark.asyncio
async def test_cuaca_matikan_gated():
    with patch("app.inti.bmkg.konfig", return_value=Konfig(CUACA_AKTIF=False)):
        out = await bmkg.ambil_cuaca_desa(kode_bmkg_adm4="18.06.17.2012", kode_perairan_bmkg="S.18.3")
    assert out["sumber"] == "BMKG"
    assert out["darat"]["status"] == "tak_tersedia"
    assert out["maritim"] is None


@pytest.mark.asyncio
async def test_cuaca_cache_hit_kedua_kali():
    cfg = Konfig(CUACA_AKTIF=True, CUACA_CACHE_TTL_DETIK=3600)
    fake_redis = AsyncMock()
    fake_redis.get = AsyncMock(return_value=None)
    fake_redis.setex = AsyncMock()

    async def _setex(kunci, ttl, raw):
        fake_redis._data = {kunci: raw}

    async def _get(kunci):
        return getattr(fake_redis, "_data", {}).get(kunci)

    fake_redis.setex.side_effect = _setex
    fake_redis.get.side_effect = _get

    with (
        patch("app.inti.bmkg.konfig", return_value=cfg),
        patch("app.inti.bmkg._r", return_value=fake_redis),
        patch("httpx.AsyncClient") as mock_client,
    ):
        mock_resp = AsyncMock()
        mock_resp.raise_for_status = lambda: None
        mock_resp.json = lambda: {"data": [{"t": 28}]}
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_resp)

        out1 = await bmkg.ambil_cuaca_desa(kode_bmkg_adm4="18.06.17.2012", kode_perairan_bmkg=None)
        assert out1["darat"]["status"] == "ok"
        assert mock_client.return_value.__aenter__.return_value.get.await_count == 1

        out2 = await bmkg.ambil_cuaca_desa(kode_bmkg_adm4="18.06.17.2012", kode_perairan_bmkg=None)
        assert out2["darat"]["status"] == "ok"
        assert mock_client.return_value.__aenter__.return_value.get.await_count == 1


@pytest.mark.asyncio
async def test_cuaca_fail_soft_tanpa_cache():
    cfg = Konfig(CUACA_AKTIF=True)
    fake_redis = AsyncMock()
    fake_redis.get = AsyncMock(return_value=None)

    with (
        patch("app.inti.bmkg.konfig", return_value=cfg),
        patch("app.inti.bmkg._r", return_value=fake_redis),
        patch("httpx.AsyncClient") as mock_client,
    ):
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(side_effect=OSError("down"))
        out = await bmkg.ambil_cuaca_desa(kode_bmkg_adm4="18.06.17.2012", kode_perairan_bmkg=None)
    assert out["darat"]["status"] == "tak_tersedia"

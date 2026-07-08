"""Perhitungan geo murni-Python untuk scaffold.

Di produksi query radius memakai PostGIS `ST_DWithin` + indeks GIST. Di sini
haversine dipakai agar gerbang test geo bisa hijau tanpa PostGIS.
"""
from __future__ import annotations

import math

RADIUS_BUMI_M = 6_371_000.0


def jarak_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * RADIUS_BUMI_M * math.asin(math.sqrt(a))


def dalam_radius(lat1: float, lng1: float, lat2: float, lng2: float, radius_m: float) -> bool:
    return jarak_m(lat1, lng1, lat2, lng2) <= radius_m

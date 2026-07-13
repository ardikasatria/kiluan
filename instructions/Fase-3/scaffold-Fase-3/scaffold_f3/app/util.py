"""Utilitas bebas-infrastruktur: id, jam, geo, paginasi.

- uuid7(): emulasi UUIDv7 (time-ordered) → keyset pagination stabil.
- Jam: controlled clock untuk domain deterministik (tanpa now() liar).
- jarak_meter(): haversine untuk geofence (emulasi ST_DWithin).
- halaman(): keyset cursor pagination atas id UUIDv7.
"""
from __future__ import annotations

import math
import os
import threading
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Callable, Iterable, Optional, TypeVar

_lock = threading.Lock()
_seq = 0


def uuid7() -> uuid.UUID:
    """UUID time-ordered (48-bit ms + 16-bit urutan + acak).

    Urutan int/leksikografik = urutan pembuatan → keyset stabil.
    Cukup untuk scaffold; produksi memakai generator UUIDv7 nyata.
    """
    global _seq
    with _lock:
        _seq = (_seq + 1) & 0xFFFF
        s = _seq
    ms = int(datetime.now(timezone.utc).timestamp() * 1000) & ((1 << 48) - 1)
    rand = int.from_bytes(os.urandom(8), "big") & ((1 << 62) - 1)
    val = (ms << 80) | (s << 64) | rand
    return uuid.UUID(int=val & ((1 << 128) - 1))


class Jam:
    """Jam terkontrol — domain tak pernah memanggil datetime.now() langsung."""

    def __init__(self, awal: Optional[datetime] = None):
        self._now = awal or datetime(2026, 7, 1, tzinfo=timezone.utc)

    def now(self) -> datetime:
        return self._now

    def maju(self, detik: float) -> None:
        from datetime import timedelta
        self._now = self._now + timedelta(seconds=detik)

    def set(self, waktu: datetime) -> None:
        self._now = waktu


def jarak_meter(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Haversine (meter) — emulasi ST_DWithin untuk geofence."""
    R = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def kunci_dimensi(dimensi: dict) -> tuple:
    """Kanonikalisasi dict dimensi → tuple hashable stabil.

    Menegakkan UNIQUE(desa_id, tanggal, kode_metrik, dimensi).
    """
    return tuple(sorted((str(k), str(v)) for k, v in (dimensi or {}).items()))


T = TypeVar("T")


@dataclass
class Halaman:
    data: list
    cursor_berikutnya: Optional[uuid.UUID]
    ada_lagi: bool


def halaman(
    items: Iterable[T],
    kunci_id: Callable[[T], uuid.UUID],
    cursor: Optional[uuid.UUID] = None,
    limit: int = 20,
) -> Halaman:
    """Keyset pagination atas UUIDv7 (stabil saat baris disisipkan di tengah)."""
    urut = sorted(items, key=lambda x: kunci_id(x).int)
    if cursor is not None:
        urut = [x for x in urut if kunci_id(x).int > cursor.int]
    potong = urut[:limit]
    ada_lagi = len(urut) > limit
    berikut = kunci_id(potong[-1]) if potong and ada_lagi else None
    return Halaman(data=potong, cursor_berikutnya=berikut, ada_lagi=ada_lagi)


def periode_dari_tanggal(t: date) -> str:
    return f"{t.year:04d}-{t.month:02d}"

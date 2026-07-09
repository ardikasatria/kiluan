"""Jam terkendali + generator id monoton (mensimulasikan UUIDv7 yang terurut waktu)."""
from __future__ import annotations

import itertools
from datetime import datetime, timedelta, timezone


class Jam:
    """Jam yang bisa dimajukan manual agar uji kedaluwarsa deterministik."""

    def __init__(self, awal: datetime | None = None) -> None:
        self._now = awal or datetime(2026, 7, 8, 4, 0, 0, tzinfo=timezone.utc)

    def now(self) -> datetime:
        return self._now

    def maju(self, menit: int = 0, detik: int = 0) -> None:
        self._now += timedelta(minutes=menit, seconds=detik)


_counter = itertools.count(1)


def id_baru(prefix: str = "018f") -> str:
    """Id terurut leksikografis sesuai urutan pembuatan (untuk keyset pagination)."""
    return f"{prefix}-{next(_counter):012x}"

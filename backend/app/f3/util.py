"""Utilitas F3 — UUIDv7 untuk keyset & sinkron offline."""
from __future__ import annotations

import os
import threading
import uuid
from datetime import date, datetime, timezone

_lock = threading.Lock()
_seq = 0


def kunci_dimensi(dimensi: dict | None) -> tuple:
    """Kanonikalisasi dict dimensi → tuple hashable stabil."""
    return tuple(sorted((str(k), str(v)) for k, v in (dimensi or {}).items()))


def periode_dari_tanggal(t: date) -> str:
    return f"{t.year:04d}-{t.month:02d}"


def uuid7() -> uuid.UUID:
    global _seq
    with _lock:
        _seq = (_seq + 1) & 0xFFFF
        s = _seq
    ms = int(datetime.now(timezone.utc).timestamp() * 1000) & ((1 << 48) - 1)
    rand = int.from_bytes(os.urandom(8), "big") & ((1 << 62) - 1)
    val = (ms << 80) | (s << 64) | rand
    return uuid.UUID(int=val & ((1 << 128) - 1))

"""Util kecil domain.

`uid()` — di produksi PK memakai UUIDv7 (terurut waktu). Di scaffold ini kita
pakai uuid4 + kolom urut monotonik (`urut()`) sebagai surrogate agar keyset
pagination deterministik saat diuji tanpa DB.
"""
from __future__ import annotations

import itertools
import uuid

_penghitung = itertools.count(1)


def uid() -> uuid.UUID:
    return uuid.uuid4()


def urut() -> int:
    """Nilai monotonik naik; jadi pengganti (dibuat_pada) untuk urutan stabil."""
    return next(_penghitung)

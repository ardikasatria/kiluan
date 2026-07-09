"""UUID + urutan monotonik untuk keyset pagination stabil."""
from __future__ import annotations

import itertools
import uuid
from datetime import datetime, timezone

_penghitung = itertools.count(1)


def uid() -> uuid.UUID:
    return uuid.uuid4()


def urut() -> int:
    return next(_penghitung)


def sekarang() -> datetime:
    return datetime.now(timezone.utc)

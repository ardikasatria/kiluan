"""Idempotensi POST uang/poin — in-memory (TTL di produksi → Redis)."""
from __future__ import annotations

from typing import Any

from app.domain.errors import IdempotencyKeyWajib


class TokoIdempotensi:
    def __init__(self) -> None:
        self._m: dict[tuple, Any] = {}

    def wajib_key(self, key: str | None) -> None:
        if not key:
            raise IdempotencyKeyWajib("Header Idempotency-Key wajib.")

    def ambil(self, key: str, pengguna_id: str, endpoint: str) -> Any | None:
        return self._m.get((key, pengguna_id, endpoint))

    def simpan(self, key: str, pengguna_id: str, endpoint: str, hasil: Any) -> Any:
        self._m[(key, pengguna_id, endpoint)] = hasil
        return hasil


toko_idempotensi = TokoIdempotensi()

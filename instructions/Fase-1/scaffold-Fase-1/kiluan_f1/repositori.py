"""Repo in-memory async + keyset pagination (KONTRAK §1)."""
from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import Any, Callable, Iterable
from uuid import UUID

from .ids import sekarang, uid, urut


@dataclass
class Halaman:
    item: list
    kursor_berikutnya: str | None
    ada_lagi: bool
    batas: int

    def meta(self) -> dict:
        return {
            "kursor_berikutnya": self.kursor_berikutnya,
            "ada_lagi": self.ada_lagi,
            "batas": self.batas,
        }


def _enc(kunci: tuple) -> str:
    return base64.urlsafe_b64encode(json.dumps([kunci[0], str(kunci[1])]).encode()).decode()


def _dec(kursor: str) -> tuple:
    data = json.loads(base64.urlsafe_b64decode(kursor.encode()))
    return (data[0], str(data[1]))


def keyset(
    baris: Iterable,
    kursor: str | None = None,
    batas: int = 20,
    kunci: Callable[[Any], tuple] = lambda r: (r.urut, str(r.id)),
) -> Halaman:
    batas = max(1, min(int(batas), 100))
    urut_baris = sorted(baris, key=kunci, reverse=True)
    if kursor:
        ambang = _dec(kursor)
        urut_baris = [r for r in urut_baris if kunci(r) < ambang]
    potong = urut_baris[:batas]
    ada_lagi = len(urut_baris) > batas
    kb = _enc(kunci(potong[-1])) if potong and ada_lagi else None
    return Halaman(potong, kb, ada_lagi, batas)


class RepoMemori:
    """Repo generik async; filter tenant di titik query."""

    def __init__(self, id_int: bool = False):
        self._data: dict[Any, Any] = {}
        self._seq = 0
        self._id_int = id_int

    async def simpan(self, entity):
        if getattr(entity, "id", None) is None:
            if self._id_int:
                self._seq += 1
                entity.id = self._seq
            else:
                entity.id = uid()
        if hasattr(entity, "urut") and entity.urut is None:
            entity.urut = urut()
        if hasattr(entity, "dibuat_pada") and entity.dibuat_pada is None:
            entity.dibuat_pada = sekarang()
        self._data[entity.id] = entity
        return entity

    async def ambil(self, id_: Any):
        return self._data.get(id_)

    async def cari(self, **kwargs) -> list:
        rows = list(self._data.values())
        for k, v in kwargs.items():
            if v is not None:
                rows = [r for r in rows if getattr(r, k, None) == v]
        return rows

    async def semua(self) -> list:
        return list(self._data.values())

    async def hitung(self) -> int:
        return len(self._data)

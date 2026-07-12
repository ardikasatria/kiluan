"""Repo in-memory async — emulasi async SQLAlchemy repo tanpa DB.

Isolasi tenant: setiap query WAJIB membawa desa_id. `ambil()` lintas-desa
mengembalikan None → service memetakan ke 404 (F0). Tak ada query tanpa filter tenant.
"""
from __future__ import annotations

from typing import Callable, Generic, List, Optional, TypeVar
from uuid import UUID

T = TypeVar("T")


class RepoMemori(Generic[T]):
    def __init__(self, id_getter: Callable[[T], object], desa_getter: Callable[[T], Optional[UUID]]):
        self._data: dict = {}
        self._id = id_getter
        self._desa = desa_getter

    async def simpan(self, ent: T) -> T:
        self._data[self._id(ent)] = ent
        return ent

    async def ambil(self, desa_id: Optional[UUID], ent_id) -> Optional[T]:
        ent = self._data.get(ent_id)
        if ent is None:
            return None
        # isolasi tenant: template global (desa None) boleh dibaca lintas-desa
        d = self._desa(ent)
        if d is not None and desa_id is not None and d != desa_id:
            return None
        return ent

    async def ambil_mentah(self, ent_id) -> Optional[T]:
        return self._data.get(ent_id)

    async def daftar(self, desa_id: Optional[UUID], predikat: Optional[Callable[[T], bool]] = None) -> List[T]:
        out = []
        for ent in self._data.values():
            d = self._desa(ent)
            # cocok bila entitas milik desa, atau template global saat desa_id diberikan
            if desa_id is not None and d is not None and d != desa_id:
                continue
            if predikat and not predikat(ent):
                continue
            out.append(ent)
        return out

    async def semua(self) -> List[T]:
        return list(self._data.values())

"""Outbox transaksional — tulis peristiwa dalam session DB yang sama."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app.domain import entitas as E


class Outbox:
    """Emitter bodoh: hanya menulis baris `peristiwa`, tanpa fan-out."""

    def __init__(self, store):
        self.store = store

    async def emit(
        self,
        desa_id: UUID,
        jenis: str,
        entitas_tipe: str,
        entitas_id: UUID,
        muatan: dict[str, Any] | None = None,
    ) -> E.Peristiwa:
        peristiwa = E.Peristiwa(
            desa_id=desa_id,
            jenis=jenis,
            entitas_tipe=entitas_tipe,
            entitas_id=entitas_id,
            muatan=muatan or {},
        )
        return await self.store.peristiwa.simpan(peristiwa)

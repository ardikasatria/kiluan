"""Skor ranking Pasar Desa berimbang (ADR-08) — bukan ORDER BY tingkat murni."""
from __future__ import annotations

from uuid import UUID

# Placeholder tata kelola; parameter final = input Pokdarwis (lihat ADR-08).
BOBOT_TINGKAT = 0.5
BOBOT_KEBARUAN = 0.35
BOBOT_ROTASI = 0.15

TINGKAT_RANK = {"lumba_lumba": 3, "bahari": 2, "tunas": 1}


def skor_ranking(*, tingkat: str | None, urut: int, entity_id: UUID) -> float:
    tr = TINGKAT_RANK.get(tingkat or "", 0)
    kebaruan = urut / 1e18
    rotasi = (entity_id.int % 1000) / 1000.0
    return BOBOT_TINGKAT * tr + BOBOT_KEBARUAN * kebaruan + BOBOT_ROTASI * rotasi

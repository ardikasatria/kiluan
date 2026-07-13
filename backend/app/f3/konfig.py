"""Konfigurasi neraca lestari — placeholder sampai disepakati FGD Pokdarwis."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class BobotNeracaLestari:
    ekologi: float = 0.4
    sosial: float = 0.3
    ekonomi: float = 0.3
    target_indikator: int = 3
    target_penyedia_lokal: int = 5
    target_gmv: float = 10_000_000.0

"""Adapter mesin Pemandu — rule default, slot model lokal (bukan OpenAI).

Ubah mesin aktif di `konfig.py` (hardcode deploy), bukan lewat GUI manajemen.
"""
from .konfig import MESIN_AKTIF, MODEL_LOKAL
from .mesin import KonteksPemandu, MesinPemandu, MesinAturan, MesinLokal, ambil_mesin

__all__ = [
    "MESIN_AKTIF",
    "MODEL_LOKAL",
    "KonteksPemandu",
    "MesinPemandu",
    "MesinAturan",
    "MesinLokal",
    "ambil_mesin",
]

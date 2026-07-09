"""Aktor permintaan + RBAC F1 (peran per-desa + kepemilikan)."""
from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID

from .enums import PERAN_PENGELOLA
from .errors import TidakBerwenang


@dataclass
class PeranAktif:
    desa_id: UUID | None
    peran: str


@dataclass
class Aktor:
    pengguna_id: UUID
    keanggotaan: list[PeranAktif] = field(default_factory=list)

    def peran_di(self, desa_id: UUID) -> set[str]:
        hasil: set[str] = set()
        for k in self.keanggotaan:
            if k.desa_id is None or k.desa_id == desa_id:
                hasil.add(k.peran)
        return hasil

    def admin_global(self) -> bool:
        return any(k.peran == "admin" and k.desa_id is None for k in self.keanggotaan)

    def pengelola(self, desa_id: UUID) -> bool:
        if self.admin_global():
            return True
        return bool(self.peran_di(desa_id) & PERAN_PENGELOLA)


def wajib_peran(aktor: Aktor, desa_id: UUID, *peran: str) -> None:
    if aktor.admin_global():
        return
    if not (aktor.peran_di(desa_id) & set(peran)):
        raise TidakBerwenang(f"Peran {peran} diperlukan.")


def wajib_pengelola(aktor: Aktor, desa_id: UUID) -> None:
    if not aktor.pengelola(desa_id):
        raise TidakBerwenang("Hanya pengelola desa.")


def buat_aktor(pengguna_id: UUID, desa_id: UUID, *peran: str) -> Aktor:
    return Aktor(
        pengguna_id=pengguna_id,
        keanggotaan=[PeranAktif(desa_id=desa_id, peran=p) for p in peran],
    )

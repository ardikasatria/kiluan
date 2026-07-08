"""Konteks permintaan (pengguna + keanggotaan) & penegakan RBAC.

`boleh`/`wajib`/`Konteks`/`PeranAktif` murni (tanpa I/O). `bangun_konteks` async
karena membaca keanggotaan dari store (repo). Keanggotaan TIDAK di JWT — di-resolve
per request (Kontrak API F0 §1).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional
from uuid import UUID

from . import rbac
from .enums import KodePeran, StatusKeanggotaan
from .errors import TidakBerwenang, TidakTerautentikasi


@dataclass
class PeranAktif:
    desa_id: Optional[UUID]  # None = global
    peran: KodePeran


@dataclass
class Konteks:
    pengguna_id: Optional[UUID] = None
    keanggotaan: list[PeranAktif] = field(default_factory=list)

    @property
    def anonim(self) -> bool:
        return self.pengguna_id is None

    def admin_global(self) -> bool:
        return any(k.peran == KodePeran.admin and k.desa_id is None for k in self.keanggotaan)

    def peran_di(self, desa_id: Optional[UUID]) -> set[KodePeran]:
        hasil: set[KodePeran] = set()
        for k in self.keanggotaan:
            if k.desa_id is None or k.desa_id == desa_id:
                hasil.add(k.peran)
        return hasil


def boleh(konteks: Konteks, aksi: str, desa_id: Optional[UUID] = None) -> bool:
    if aksi == rbac.BACA_PUBLIK:
        return True
    if konteks.anonim:
        return False
    if konteks.admin_global():
        return True
    perlu = rbac.MATRIKS.get(aksi, set())
    return bool(konteks.peran_di(desa_id) & perlu)


def wajib(konteks: Konteks, aksi: str, desa_id: Optional[UUID] = None) -> None:
    if boleh(konteks, aksi, desa_id):
        return
    if konteks.anonim:
        raise TidakTerautentikasi("perlu masuk terlebih dahulu")
    raise TidakBerwenang("peran/scope tidak mencukupi untuk aksi ini")


async def bangun_konteks(store, pengguna_id: Optional[UUID]) -> Konteks:
    """Resolve keanggotaan aktif pengguna dari store (async)."""
    if pengguna_id is None:
        return Konteks()
    baris = await store.keanggotaan.daftar_pengguna(pengguna_id)
    aktif = [
        PeranAktif(desa_id=k.desa_id, peran=k.peran)
        for k in baris
        if k.status == StatusKeanggotaan.aktif
    ]
    return Konteks(pengguna_id=pengguna_id, keanggotaan=aktif)

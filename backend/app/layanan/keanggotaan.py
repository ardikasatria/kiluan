"""Balai Warga — keanggotaan (async): ajukan peran + persetujuan pengelola."""
from __future__ import annotations

from uuid import UUID

from ..domain import konteks as ctx
from ..domain import rbac
from ..domain.entitas import Keanggotaan
from ..domain.enums import KodePeran, StatusKeanggotaan
from ..domain.errors import KesalahanValidasi, TidakDitemukan

_AUTO_AKTIF = {KodePeran.wisatawan, KodePeran.kontributor}


class KeanggotaanLayanan:
    def __init__(self, store):
        self.store = store

    async def ajukan(self, konteks: ctx.Konteks, desa_id: UUID, peran: KodePeran) -> Keanggotaan:
        ctx.wajib(konteks, rbac.AJUKAN_KEANGGOTAAN, desa_id)
        if peran == KodePeran.admin:
            raise KesalahanValidasi("peran admin tidak dapat diajukan sendiri")
        status = StatusKeanggotaan.aktif if peran in _AUTO_AKTIF else StatusKeanggotaan.menunggu
        k = Keanggotaan(pengguna_id=konteks.pengguna_id, peran=peran, desa_id=desa_id, status=status)
        return await self.store.keanggotaan.tambah(k)

    async def daftar(self, konteks: ctx.Konteks, desa_id: UUID, peran=None, status=None):
        ctx.wajib(konteks, rbac.KELOLA_KEANGGOTAAN, desa_id)
        return await self.store.keanggotaan.daftar_desa(desa_id, peran=peran, status=status)

    async def putuskan(self, konteks: ctx.Konteks, desa_id: UUID, keanggotaan_id: UUID,
                       status_baru: StatusKeanggotaan) -> Keanggotaan:
        ctx.wajib(konteks, rbac.KELOLA_KEANGGOTAAN, desa_id)
        k = await self.store.keanggotaan.ambil(keanggotaan_id)
        if k is None or k.desa_id != desa_id:  # lintas-tenant → 404
            raise TidakDitemukan("keanggotaan tidak ditemukan")
        k.status = status_baru
        return k

"""Dependency FastAPI: session, autentikasi, konteks, resolusi tenant, RBAC."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import Depends, Header

from app.domain.errors import TidakDitemukan, TidakTerautentikasi
from app.domain.konteks import Konteks, bangun_konteks, wajib
from app.inti import keamanan
from app.inti.db import BuatSesi
from app.repo.sql import Penyimpanan


async def get_penyimpanan():
    """Satu session per request; commit di akhir, rollback bila error."""
    async with BuatSesi() as sesi:
        store = Penyimpanan(sesi)
        try:
            yield store
            await sesi.commit()
        except Exception:
            await sesi.rollback()
            raise


async def pengguna_id_opsional(authorization: Optional[str] = Header(default=None)) -> Optional[UUID]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = keamanan.baca_access(token)
    except TidakTerautentikasi:
        # Token kedaluwarsa/invalid — anggap anonim agar klien bisa segarkan via cookie.
        return None
    return UUID(payload["sub"])


async def konteks_saat_ini(
    store: Penyimpanan = Depends(get_penyimpanan),
    pengguna_id: Optional[UUID] = Depends(pengguna_id_opsional),
) -> Konteks:
    return await bangun_konteks(store, pengguna_id)


async def resolusi_desa(slug: str, store: Penyimpanan = Depends(get_penyimpanan)) -> UUID:
    d = await store.desa.ambil_slug(slug)
    if d is None:
        raise TidakDitemukan("desa tidak ditemukan")
    # Menyiapkan RLS F4: set app.desa_id pada koneksi.
    # await store.sesi.execute(text("SELECT set_config('app.desa_id', :v, true)"), {"v": str(d.id)})
    return d.id


def wajib_peran(aksi: str):
    """Factory dependency: pastikan konteks berwenang untuk `aksi` di desa path."""

    async def _dep(
        konteks: Konteks = Depends(konteks_saat_ini),
        desa_id: UUID = Depends(resolusi_desa),
    ) -> Konteks:
        wajib(konteks, aksi, desa_id)
        return konteks

    return _dep

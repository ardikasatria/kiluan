"""Router Genta — inbox notifikasi (KONTRAK addendum F2 §B.1)."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_penyimpanan, pengguna_id_opsional, resolusi_desa
from app.domain.errors import TidakTerautentikasi
from app.domain.konteks import bangun_konteks
from app.layanan.genta import GentaLayanan

router = APIRouter(prefix="/api/v1/desa/{slug}", tags=["notifikasi"])


async def _wajib_login(pengguna_id: Optional[UUID] = Depends(pengguna_id_opsional)) -> UUID:
    if pengguna_id is None:
        raise TidakTerautentikasi("perlu masuk terlebih dahulu")
    return pengguna_id


def _svc(store=Depends(get_penyimpanan)) -> GentaLayanan:
    return GentaLayanan(store)


@router.get("/notifikasi")
async def inbox_notifikasi(
    desa_id: UUID = Depends(resolusi_desa),
    status: str | None = None,
    batas: int = Query(20, ge=1, le=100),
    kursor: str | None = None,
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: GentaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    return await svc.inbox(konteks, desa_id, status=status, kursor=kursor, batas=batas)


@router.get("/notifikasi/hitung")
async def hitung_notifikasi(
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: GentaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    return await svc.hitung(konteks, desa_id)


@router.post("/notifikasi/{notifikasi_id}/baca")
async def baca_notifikasi(
    notifikasi_id: UUID,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: GentaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    return await svc.baca(konteks, desa_id, notifikasi_id)


@router.post("/notifikasi/baca-semua")
async def baca_semua_notifikasi(
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: GentaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    return await svc.baca_semua(konteks, desa_id)

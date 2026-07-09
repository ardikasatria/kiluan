"""Router Lencana Warga — KONTRAK F1 §5."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_penyimpanan, pengguna_id_opsional, resolusi_desa
from app.domain.errors import TidakTerautentikasi
from app.layanan.lencana_warga import LencanaLayanan

router = APIRouter(prefix="/api/v1/desa/{slug}", tags=["lencana"])


async def _wajib_login(pengguna_id: Optional[UUID] = Depends(pengguna_id_opsional)) -> UUID:
    if pengguna_id is None:
        raise TidakTerautentikasi("perlu masuk terlebih dahulu")
    return pengguna_id


def _svc(store=Depends(get_penyimpanan)) -> LencanaLayanan:
    return LencanaLayanan(store)


@router.get("/poin/saya")
async def poin_saya(
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    kursor: str | None = None,
    batas: int = Query(20, ge=1, le=100),
    svc: LencanaLayanan = Depends(_svc),
):
    return await svc.poin_saya(desa_id, pengguna_id, kursor=kursor, batas=batas)


@router.get("/leaderboard")
async def leaderboard(
    desa_id: UUID = Depends(resolusi_desa),
    periode: str = Query("all", pattern="^(all|7h|30h)$"),
    batas: int = Query(20, ge=1, le=100),
    svc: LencanaLayanan = Depends(_svc),
):
    return {"item": await svc.leaderboard(desa_id, periode=periode, batas=batas)}


@router.get("/badge")
async def katalog_badge(
    desa_id: UUID = Depends(resolusi_desa),
    svc: LencanaLayanan = Depends(_svc),
):
    return {"item": await svc.katalog_badge(desa_id)}


@router.get("/badge/saya")
async def badge_saya(
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    svc: LencanaLayanan = Depends(_svc),
):
    return {"item": await svc.badge_saya(desa_id, pengguna_id)}


@router.get("/aturan-poin")
async def aturan_poin(
    desa_id: UUID = Depends(resolusi_desa),
    svc: LencanaLayanan = Depends(_svc),
):
    return {"item": await svc.aturan_poin(desa_id)}

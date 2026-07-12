"""Router wishlist — /saya/simpanan."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel, Field

from app.api.deps import get_penyimpanan, pengguna_id_opsional
from app.domain.errors import TidakTerautentikasi
from app.layanan.simpanan import SimpananLayanan

router = APIRouter(prefix="/api/v1/saya/simpanan", tags=["simpanan"])


async def _wajib_login(pengguna_id: Optional[UUID] = Depends(pengguna_id_opsional)) -> UUID:
    if pengguna_id is None:
        raise TidakTerautentikasi("perlu masuk terlebih dahulu")
    return pengguna_id


def _svc(store) -> SimpananLayanan:
    return SimpananLayanan(store)


class TambahSimpananReq(BaseModel):
    tipe: str = Field(..., pattern="^(destinasi|paket|misi)$")
    entitas_id: UUID
    catatan: Optional[str] = None


class UbahCatatanReq(BaseModel):
    catatan: Optional[str] = None


@router.get("")
async def daftar(
    tipe: Optional[str] = Query(None),
    batas: int = Query(20, ge=1, le=100),
    kursor: Optional[str] = Query(None),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
):
    return await _svc(store).daftar(pengguna_id, tipe=tipe, batas=batas, kursor=kursor)


@router.get("/status")
async def cek_status(
    tipe: str = Query(..., pattern="^(destinasi|paket|misi)$"),
    entitas_id: list[UUID] = Query(...),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
):
    return {"item": await _svc(store).status(pengguna_id, tipe, entitas_id)}


@router.post("", status_code=201)
async def tambah(
    req: TambahSimpananReq,
    response: Response,
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
):
    row, baru = await _svc(store).tambah(
        pengguna_id, req.tipe, req.entitas_id, catatan=req.catatan,
    )
    if not baru:
        response.status_code = 200
    return await _svc(store)._serial_item(row)


@router.patch("/{simpanan_id}")
async def ubah_catatan(
    simpanan_id: UUID,
    req: UbahCatatanReq,
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
):
    s = await _svc(store).ubah_catatan(pengguna_id, simpanan_id, req.catatan)
    return await _svc(store)._serial_item(s)


@router.delete("/{simpanan_id}", status_code=204)
async def hapus(
    simpanan_id: UUID,
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
):
    await _svc(store).hapus(pengguna_id, simpanan_id)

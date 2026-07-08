"""Router kalender aktivitas — /desa/{slug}/kalender."""
from __future__ import annotations

from datetime import date, time
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel

from app.api import bantu
from app.api.deps import get_penyimpanan, konteks_saat_ini, resolusi_desa, wajib_peran
from app.domain import rbac
from app.domain.enums import StatusKalender, TipeKalender
from app.layanan.kalender import KalenderLayanan

router = APIRouter(prefix="/api/v1/desa/{slug}/kalender", tags=["kalender"])


class KalenderBuat(BaseModel):
    judul: str
    tipe: TipeKalender
    waktu_mulai: time
    waktu_selesai: time
    berlaku_mulai: date
    destinasi_id: Optional[UUID] = None
    deskripsi: Optional[str] = None
    pengulangan: Optional[dict] = None
    berlaku_sampai: Optional[date] = None
    status: StatusKalender = StatusKalender.aktif


class KalenderUbah(BaseModel):
    judul: Optional[str] = None
    tipe: Optional[TipeKalender] = None
    waktu_mulai: Optional[time] = None
    waktu_selesai: Optional[time] = None
    berlaku_mulai: Optional[date] = None
    berlaku_sampai: Optional[date] = None
    destinasi_id: Optional[UUID] = None
    deskripsi: Optional[str] = None
    pengulangan: Optional[dict] = None
    status: Optional[StatusKalender] = None


def _svc(store) -> KalenderLayanan:
    return KalenderLayanan(store)


@router.get("")
async def daftar(
    destinasi_id: Optional[UUID] = None,
    tipe: Optional[TipeKalender] = None,
    konteks=Depends(konteks_saat_ini),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    baris = await _svc(store).daftar(konteks, desa_id, destinasi_id=destinasi_id, tipe=tipe)
    return {"item": [bantu.kalender_dict(k) for k in baris]}


@router.get("/{kalender_id}")
async def detail(
    kalender_id: UUID,
    konteks=Depends(konteks_saat_ini),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    k = await _svc(store).detail(konteks, desa_id, kalender_id)
    return bantu.kalender_dict(k)


@router.post("", status_code=201)
async def buat(
    req: KalenderBuat,
    konteks=Depends(wajib_peran(rbac.KELOLA_KALENDER)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    k = await _svc(store).buat(
        konteks, desa_id,
        judul=req.judul, tipe=req.tipe,
        waktu_mulai=req.waktu_mulai, waktu_selesai=req.waktu_selesai,
        berlaku_mulai=req.berlaku_mulai, destinasi_id=req.destinasi_id,
        deskripsi=req.deskripsi, pengulangan=req.pengulangan,
        berlaku_sampai=req.berlaku_sampai, status=req.status,
    )
    return bantu.kalender_dict(k)


@router.patch("/{kalender_id}")
async def ubah(
    kalender_id: UUID,
    req: KalenderUbah,
    konteks=Depends(wajib_peran(rbac.KELOLA_KALENDER)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    k = await _svc(store).ubah(konteks, desa_id, kalender_id, **req.model_dump(exclude_unset=True))
    return bantu.kalender_dict(k)


@router.delete("/{kalender_id}", status_code=204)
async def hapus(
    kalender_id: UUID,
    konteks=Depends(wajib_peran(rbac.KELOLA_KALENDER)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    await _svc(store).hapus(konteks, desa_id, kalender_id)
    return Response(status_code=204)

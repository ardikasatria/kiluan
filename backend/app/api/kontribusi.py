"""Router Dapur Konten — KONTRAK F1 §4."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.api.deps import get_penyimpanan, pengguna_id_opsional, resolusi_desa
from app.domain.errors import TidakTerautentikasi
from app.domain.konteks import bangun_konteks
from app.layanan.dapur_konten import DapurKontenLayanan

router = APIRouter(prefix="/api/v1/desa/{slug}", tags=["kontribusi"])


async def _wajib_login(pengguna_id: Optional[UUID] = Depends(pengguna_id_opsional)) -> UUID:
    if pengguna_id is None:
        raise TidakTerautentikasi("perlu masuk terlebih dahulu")
    return pengguna_id


def _svc(store=Depends(get_penyimpanan)) -> DapurKontenLayanan:
    return DapurKontenLayanan(store)


class KontribusiBuat(BaseModel):
    tipe: str
    target_tipe: str
    target_id: UUID | None = None
    muatan: dict = Field(default_factory=dict)
    media_id: UUID | None = None


class KontribusiRevisi(BaseModel):
    muatan: dict
    media_id: UUID | None = None


class TransisiBody(BaseModel):
    aksi: str
    catatan: str = ""


@router.post("/kontribusi", status_code=201)
async def kirim_kontribusi(
    req: KontribusiBuat,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: DapurKontenLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    k = await svc.kirim(konteks, desa_id, req.model_dump())
    return svc._dto(k)


@router.get("/kontribusi")
async def daftar_kontribusi(
    desa_id: UUID = Depends(resolusi_desa),
    status: str | None = None,
    tipe: str | None = None,
    target_tipe: str | None = None,
    milik: str | None = None,
    batas: int = Query(20, ge=1, le=100),
    kursor: str | None = None,
    pengguna_id: Optional[UUID] = Depends(pengguna_id_opsional),
    store=Depends(get_penyimpanan),
    svc: DapurKontenLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    return await svc.daftar(
        konteks,
        desa_id,
        status=status,
        tipe=tipe,
        target_tipe=target_tipe,
        milik_saya=milik == "saya",
        kursor=kursor,
        batas=batas,
    )


@router.get("/kontribusi/{kontribusi_id}")
async def detail_kontribusi(
    kontribusi_id: UUID,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: DapurKontenLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    return await svc.detail(konteks, desa_id, kontribusi_id)


@router.patch("/kontribusi/{kontribusi_id}")
async def revisi_kontribusi(
    kontribusi_id: UUID,
    req: KontribusiRevisi,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: DapurKontenLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    k = await svc.revisi(konteks, desa_id, kontribusi_id, req.muatan, req.media_id)
    return svc._dto(k)


@router.post("/kontribusi/{kontribusi_id}/transisi")
async def transisi_kontribusi(
    kontribusi_id: UUID,
    req: TransisiBody,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: DapurKontenLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    k = await svc.transisi(konteks, desa_id, kontribusi_id, req.aksi, req.catatan)
    return svc._dto(k)

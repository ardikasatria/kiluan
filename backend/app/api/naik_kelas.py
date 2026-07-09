"""Router Naik Kelas Lestari — KONTRAK F1 §7."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.api.deps import get_penyimpanan, pengguna_id_opsional, resolusi_desa
from app.domain.errors import TidakTerautentikasi
from app.domain.konteks import bangun_konteks
from app.layanan.naik_kelas import NaikKelasLayanan

router = APIRouter(prefix="/api/v1/desa/{slug}", tags=["naik-kelas"])


async def _wajib_login(pengguna_id: Optional[UUID] = Depends(pengguna_id_opsional)) -> UUID:
    if pengguna_id is None:
        raise TidakTerautentikasi("perlu masuk terlebih dahulu")
    return pengguna_id


def _svc(store=Depends(get_penyimpanan)) -> NaikKelasLayanan:
    return NaikKelasLayanan(store)


class PengajuanBuat(BaseModel):
    subjek_tipe: str
    subjek_id: UUID
    kartu_id: int
    bukti: dict = Field(default_factory=dict)


class PengajuanRevisi(BaseModel):
    bukti: dict


class TransisiBody(BaseModel):
    aksi: str
    catatan: str = ""


@router.get("/kartu-aksi")
async def daftar_kartu(
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    svc: NaikKelasLayanan = Depends(_svc),
):
    return {"item": await svc.daftar_kartu(desa_id)}


@router.get("/kartu-aksi/{kartu_id}")
async def detail_kartu(
    kartu_id: int,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    svc: NaikKelasLayanan = Depends(_svc),
):
    return await svc.detail_kartu(desa_id, kartu_id)


@router.post("/pengajuan-kartu", status_code=201)
async def ajukan_kartu(
    req: PengajuanBuat,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: NaikKelasLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    p = await svc.ajukan(konteks, desa_id, req.model_dump())
    return await svc._dto_pengajuan(p)


@router.get("/pengajuan-kartu")
async def daftar_pengajuan(
    desa_id: UUID = Depends(resolusi_desa),
    status: str | None = None,
    subjek_tipe: str | None = None,
    subjek_id: UUID | None = None,
    milik: str | None = None,
    batas: int = Query(20, ge=1, le=100),
    kursor: str | None = None,
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: NaikKelasLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    return await svc.daftar_pengajuan(
        konteks,
        desa_id,
        status=status,
        subjek_tipe=subjek_tipe,
        subjek_id=subjek_id,
        milik_saya=milik == "saya",
        kursor=kursor,
        batas=batas,
    )


@router.get("/pengajuan-kartu/{pengajuan_id}")
async def detail_pengajuan(
    pengajuan_id: UUID,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: NaikKelasLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    return await svc.detail_pengajuan(konteks, desa_id, pengajuan_id)


@router.patch("/pengajuan-kartu/{pengajuan_id}")
async def revisi_pengajuan(
    pengajuan_id: UUID,
    req: PengajuanRevisi,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: NaikKelasLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    p = await svc.revisi_bukti(konteks, desa_id, pengajuan_id, req.bukti)
    return await svc._dto_pengajuan(p)


@router.post("/pengajuan-kartu/{pengajuan_id}/transisi")
async def transisi_pengajuan(
    pengajuan_id: UUID,
    req: TransisiBody,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: NaikKelasLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    p = await svc.transisi(konteks, desa_id, pengajuan_id, req.aksi, req.catatan)
    return await svc._dto_pengajuan(p)


@router.get("/sertifikasi")
async def get_sertifikasi(
    subjek_tipe: str = Query(...),
    subjek_id: UUID = Query(...),
    desa_id: UUID = Depends(resolusi_desa),
    svc: NaikKelasLayanan = Depends(_svc),
):
    hasil = await svc.ambil_sertifikasi(desa_id, subjek_tipe, subjek_id)
    if hasil is None:
        return {"tingkat": None, "skor": 0, "diperbarui_pada": None}
    return hasil

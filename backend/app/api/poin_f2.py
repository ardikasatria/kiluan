"""Router kupon & tukar poin (KONTRAK F2 §5)."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel

from app.api.deps import get_penyimpanan, konteks_saat_ini, resolusi_desa
from app.domain.konteks import Konteks
from app.layanan.poin import PoinLayanan
from app.skema.f2 import hadiah_dto, kupon_dto, penukaran_dto

router = APIRouter(prefix="/api/v1/desa/{slug}", tags=["poin"])


def _svc(store=Depends(get_penyimpanan)) -> PoinLayanan:
    return PoinLayanan(store)


class TukarBody(BaseModel):
    hadiah_id: str


class HadiahBody(BaseModel):
    kode: str | None = None
    nama: str
    jenis: str
    biaya_poin: int
    deskripsi: str | None = None
    stok: int | None = None
    syarat: dict | None = None
    aktif: bool = True


class HadiahUbahBody(BaseModel):
    nama: str | None = None
    deskripsi: str | None = None
    stok: int | None = None
    syarat: dict | None = None
    aktif: bool | None = None
    biaya_poin: int | None = None


class KuponBody(BaseModel):
    kode: str
    sumber: str = "kampanye"
    tipe_diskon: str = "nominal"
    nilai: float
    min_belanja: float | None = None
    batas_pakai: int = 100
    penyedia_terbatas: list[str] | None = None
    berlaku_mulai: datetime | None = None
    berlaku_sampai: datetime | None = None


@router.get("/hadiah")
async def daftar_hadiah(
    desa_id: UUID = Depends(resolusi_desa),
    svc: PoinLayanan = Depends(_svc),
):
    rows = await svc.daftar_hadiah(desa_id)
    return {"item": [hadiah_dto(h) for h in rows]}


@router.get("/hadiah/{hadiah_id}")
async def detail_hadiah(
    hadiah_id: str,
    desa_id: UUID = Depends(resolusi_desa),
    svc: PoinLayanan = Depends(_svc),
):
    h = await svc.hadiah.wajib(UUID(hadiah_id), desa_id)
    return {"hadiah": hadiah_dto(h)}


@router.post("/hadiah", status_code=201)
async def buat_hadiah(
    body: HadiahBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PoinLayanan = Depends(_svc),
):
    h = await svc.buat_hadiah(konteks, desa_id, body.model_dump())
    return {"hadiah": hadiah_dto(h)}


@router.patch("/hadiah/{hadiah_id}")
async def ubah_hadiah(
    hadiah_id: str,
    body: HadiahUbahBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PoinLayanan = Depends(_svc),
):
    h = await svc.ubah_hadiah(
        konteks, desa_id, UUID(hadiah_id), body.model_dump(exclude_unset=True),
    )
    return {"hadiah": hadiah_dto(h)}


@router.post("/tukar", status_code=201)
async def tukar_poin(
    body: TukarBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PoinLayanan = Depends(_svc),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    hasil = await svc.tukar(konteks, desa_id, UUID(body.hadiah_id), idempotency_key=idempotency_key)
    pen = hasil["penukaran"]
    kupon = hasil.get("kupon")
    return {
        "penukaran": penukaran_dto(pen),
        "kupon": kupon_dto(kupon) if kupon else None,
    }


@router.get("/penukaran/saya")
async def penukaran_saya(
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PoinLayanan = Depends(_svc),
):
    rows = await svc.daftar_penukaran(konteks, desa_id)
    return {"item": [penukaran_dto(p) for p in rows]}


@router.get("/kupon/saya")
async def kupon_saya(
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PoinLayanan = Depends(_svc),
):
    rows = await svc.daftar_kupon_saya(konteks, desa_id)
    return {"item": [kupon_dto(k) for k in rows]}


@router.get("/kupon/{kode}/cek")
async def cek_kupon(
    kode: str,
    total: float = Query(...),
    penyedia: str | None = None,
    desa_id: UUID = Depends(resolusi_desa),
    svc: PoinLayanan = Depends(_svc),
):
    penyedia_set = {penyedia} if penyedia else set()
    return await svc.cek_kupon(desa_id, kode, Decimal(str(total)), penyedia_set)


@router.post("/kupon", status_code=201)
async def buat_kupon(
    body: KuponBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PoinLayanan = Depends(_svc),
):
    k = await svc.buat_kupon(konteks, desa_id, body.model_dump())
    return {"kupon": kupon_dto(k)}

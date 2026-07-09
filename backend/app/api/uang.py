"""Router escrow, payout, refund, rekening, pengaturan (KONTRAK F2 §4)."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel

from app.api.deps import get_penyimpanan, konteks_saat_ini, resolusi_desa
from app.domain.konteks import Konteks
from app.layanan.uang import UangLayanan
from app.skema.f2 import (
    payout_dto,
    pengaturan_dto,
    refund_dto,
    rekening_dto,
    transaksi_dto,
)

router = APIRouter(prefix="/api/v1/desa/{slug}", tags=["uang"])


def _svc(store=Depends(get_penyimpanan)) -> UangLayanan:
    return UangLayanan(store)


class PayoutBody(BaseModel):
    penyedia_tipe: str
    penyedia_id: str
    rekening_id: str
    metode: str = "manual"


class TransisiBody(BaseModel):
    aksi: str


class RefundBody(BaseModel):
    pesanan_id: str
    alasan: str
    jumlah: float | None = None
    pesanan_item_id: str | None = None


class RekeningBody(BaseModel):
    penyedia_tipe: str
    penyedia_id: str
    jenis: str
    nomor: str
    nama_pemilik: str
    bank_kode: str | None = None
    utama: bool = True


class RekeningUbahBody(BaseModel):
    utama: bool | None = None
    nama_pemilik: str | None = None


class VerifikasiRekeningBody(BaseModel):
    terverifikasi: bool = True


class PengaturanUbahBody(BaseModel):
    persen_reinvestasi: float | None = None
    persen_fee_platform: float | None = None
    batas_hold_menit: int | None = None
    gateway: str | None = None
    kebijakan_pembatalan: dict | None = None


@router.get("/transaksi")
async def daftar_transaksi(
    penyedia_tipe: str | None = None,
    penyedia_id: str | None = None,
    status: str | None = None,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: UangLayanan = Depends(_svc),
):
    pid = UUID(penyedia_id) if penyedia_id else None
    rows = await svc.daftar_transaksi(konteks, desa_id, penyedia_tipe, pid, status)
    return {"item": [transaksi_dto(t) for t in rows]}


@router.get("/rekening")
async def daftar_rekening(
    penyedia_tipe: str | None = None,
    penyedia_id: str | None = None,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: UangLayanan = Depends(_svc),
):
    pid = UUID(penyedia_id) if penyedia_id else None
    rows = await svc.daftar_rekening(konteks, desa_id, penyedia_tipe, pid)
    return {"item": [rekening_dto(r) for r in rows]}


@router.post("/rekening", status_code=201)
async def buat_rekening(
    body: RekeningBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: UangLayanan = Depends(_svc),
):
    r = await svc.buat_rekening(konteks, desa_id, body.model_dump())
    return {"rekening": rekening_dto(r)}


@router.patch("/rekening/{rekening_id}")
async def ubah_rekening(
    rekening_id: str,
    body: RekeningUbahBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: UangLayanan = Depends(_svc),
):
    r = await svc.ubah_rekening(
        konteks, desa_id, UUID(rekening_id), body.model_dump(exclude_unset=True),
    )
    return {"rekening": rekening_dto(r)}


@router.patch("/rekening/{rekening_id}/verifikasi")
async def verifikasi_rekening(
    rekening_id: str,
    body: VerifikasiRekeningBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: UangLayanan = Depends(_svc),
):
    r = await svc.verifikasi_rekening(konteks, desa_id, UUID(rekening_id), body.terverifikasi)
    return {"rekening": rekening_dto(r)}


@router.delete("/rekening/{rekening_id}", status_code=204)
async def hapus_rekening(
    rekening_id: str,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: UangLayanan = Depends(_svc),
):
    await svc.hapus_rekening(konteks, desa_id, UUID(rekening_id))


@router.get("/payout")
async def daftar_payout(
    penyedia_id: str | None = None,
    status: str | None = None,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: UangLayanan = Depends(_svc),
):
    pid = UUID(penyedia_id) if penyedia_id else None
    rows = await svc.daftar_payout(konteks, desa_id, pid, status)
    return {"item": [payout_dto(p) for p in rows]}


@router.post("/payout", status_code=201)
async def buat_payout(
    body: PayoutBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: UangLayanan = Depends(_svc),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    p = await svc.buat_payout(
        konteks, desa_id, body.penyedia_tipe, UUID(body.penyedia_id),
        UUID(body.rekening_id), body.metode, idempotency_key=idempotency_key,
    )
    return {"payout": payout_dto(p)}


@router.post("/payout/{payout_id}/transisi")
async def transisi_payout(
    payout_id: str,
    body: TransisiBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: UangLayanan = Depends(_svc),
):
    p = await svc.transisi_payout(konteks, desa_id, UUID(payout_id), body.aksi)
    return {"payout": payout_dto(p)}


@router.post("/refund", status_code=201)
async def ajukan_refund(
    body: RefundBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: UangLayanan = Depends(_svc),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    from decimal import Decimal

    r = await svc.ajukan_refund(
        konteks, desa_id, UUID(body.pesanan_id), body.alasan,
        Decimal(str(body.jumlah)) if body.jumlah is not None else None,
        UUID(body.pesanan_item_id) if body.pesanan_item_id else None,
        idempotency_key=idempotency_key,
    )
    return {"refund": refund_dto(r)}


@router.get("/refund")
async def daftar_refund(
    status: str | None = None,
    milik: str | None = Query(default=None, alias="milik"),
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: UangLayanan = Depends(_svc),
):
    rows = await svc.daftar_refund(konteks, desa_id, status, milik_saya=milik == "saya")
    return {"item": [refund_dto(r) for r in rows]}


@router.get("/refund/{refund_id}")
async def detail_refund(
    refund_id: str,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: UangLayanan = Depends(_svc),
):
    r = await svc.ambil_refund(konteks, desa_id, UUID(refund_id))
    return {"refund": refund_dto(r)}


@router.post("/refund/{refund_id}/transisi")
async def transisi_refund(
    refund_id: str,
    body: TransisiBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: UangLayanan = Depends(_svc),
):
    r = await svc.transisi_refund(konteks, desa_id, UUID(refund_id), body.aksi)
    return {"refund": refund_dto(r)}


@router.get("/pengaturan")
async def baca_pengaturan(
    desa_id: UUID = Depends(resolusi_desa),
    svc: UangLayanan = Depends(_svc),
):
    p = await svc.baca_pengaturan(desa_id)
    return pengaturan_dto(p)


@router.patch("/pengaturan")
async def ubah_pengaturan(
    body: PengaturanUbahBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: UangLayanan = Depends(_svc),
):
    p = await svc.ubah_pengaturan(konteks, desa_id, body.model_dump(exclude_unset=True))
    return pengaturan_dto(p)

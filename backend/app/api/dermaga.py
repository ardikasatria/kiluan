"""Router Dermaga F2 — checkout, slot, pesanan, pembayaran, booking (KONTRAK §2–3)."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel, Field

from app.api.deps import get_penyimpanan, konteks_saat_ini, pengguna_id_opsional, resolusi_desa
from app.domain.errors import TidakTerautentikasi
from app.domain.konteks import Konteks
from app.inti.pembayaran import penyedia_bayar
from app.layanan.dermaga import DermagaLayanan
from app.skema.f2 import booking_dto, pembayaran_dto, pesanan_detail, pesanan_ringkas, slot_dto

router = APIRouter(prefix="/api/v1/desa/{slug}", tags=["dermaga"])


def _svc(store=Depends(get_penyimpanan)) -> DermagaLayanan:
    return DermagaLayanan(store)


async def _wajib_login(pid: Optional[UUID] = Depends(pengguna_id_opsional)) -> UUID:
    if pid is None:
        raise TidakTerautentikasi("perlu masuk terlebih dahulu")
    return pid


class SlotBuat(BaseModel):
    subjek_tipe: str
    subjek_id: str
    tanggal: str
    kuota: int
    waktu_mulai: str | None = None
    harga_override: float | None = None


class SlotBatchBody(BaseModel):
    subjek_tipe: str
    subjek_id: str
    dari: str
    sampai: str
    kuota: int
    waktu_mulai: str | None = None
    harga_override: float | None = None


class SlotUbahBody(BaseModel):
    kuota: int | None = None
    harga_override: float | None = None
    status: str | None = None


class FulfillmentBody(BaseModel):
    status_fulfillment: str


class CheckoutBody(BaseModel):
    kontak: dict = Field(default_factory=dict)
    metode_ambil: str = "ambil_ditempat"
    alamat_kirim: dict | None = None
    kupon_id: str | None = None
    kupon_kode: str | None = None
    ongkir: float = 0
    item: list[dict]


class PembayaranBody(BaseModel):
    metode: str = "transfer_manual"


class BuktiBody(BaseModel):
    bukti_media_id: str


@router.get("/slot")
async def daftar_slot(
    subjek_tipe: str = Query(...),
    subjek_id: str = Query(...),
    dari: str | None = None,
    sampai: str | None = None,
    kelola: bool = False,
    desa_id: UUID = Depends(resolusi_desa),
    svc: DermagaLayanan = Depends(_svc),
):
    slots = await svc.daftar_slot(
        desa_id, subjek_tipe, UUID(subjek_id), dari, sampai, kelola=kelola,
    )
    return {"item": [slot_dto(s) for s in slots]}


@router.post("/slot", status_code=201)
async def buat_slot(
    body: SlotBuat,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: DermagaLayanan = Depends(_svc),
):
    if not (konteks.admin_global() or konteks.peran_di(desa_id)):
        from app.domain.errors import TidakBerwenang
        raise TidakBerwenang()
    slot = await svc.buat_slot(desa_id, body.model_dump())
    return slot_dto(slot)


@router.post("/slot/batch", status_code=201)
async def buat_slot_batch(
    body: SlotBatchBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: DermagaLayanan = Depends(_svc),
):
    if not (konteks.admin_global() or konteks.peran_di(desa_id)):
        from app.domain.errors import TidakBerwenang
        raise TidakBerwenang()
    slots = await svc.buat_slot_batch(desa_id, body.model_dump())
    return {"item": [slot_dto(s) for s in slots]}


@router.patch("/slot/{slot_id}")
async def ubah_slot(
    slot_id: str,
    body: SlotUbahBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: DermagaLayanan = Depends(_svc),
):
    slot = await svc.ubah_slot(
        konteks, desa_id, UUID(slot_id), body.model_dump(exclude_unset=True),
    )
    return slot_dto(slot)


@router.delete("/slot/{slot_id}", status_code=204)
async def hapus_slot(
    slot_id: str,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: DermagaLayanan = Depends(_svc),
):
    await svc.hapus_slot(konteks, desa_id, UUID(slot_id))


@router.post("/checkout", status_code=201)
async def checkout(
    body: CheckoutBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: DermagaLayanan = Depends(_svc),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    pesanan = await svc.checkout(konteks, desa_id, body.model_dump(), idempotency_key=idempotency_key)
    items = await svc.item.daftar_pesanan(pesanan.id)
    return {
        "pesanan": pesanan_detail(pesanan, items),
        "pembayaran": {"instruksi": "pilih_metode"},
    }


@router.get("/pesanan")
async def daftar_pesanan(
    status: str | None = None,
    milik: str | None = None,
    kelola: bool = False,
    penyedia_tipe: str | None = None,
    penyedia_id: str | None = None,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    pid: UUID = Depends(_wajib_login),
    svc: DermagaLayanan = Depends(_svc),
):
    if kelola or penyedia_tipe or penyedia_id:
        pid_pen = UUID(penyedia_id) if penyedia_id else None
        rows = await svc.daftar_pesanan_penyedia(
            konteks, desa_id, penyedia_tipe, pid_pen, status=status,
        )
        return {
            "item": [
                pesanan_detail(p, items, bmap)
                for p, items, bmap in rows
            ],
        }
    pembeli = pid if milik == "saya" else None
    rows = await svc.pesanan.daftar(desa_id, status=status, pembeli_id=pembeli)
    return {"item": [pesanan_ringkas(p) for p in rows]}


@router.get("/pesanan/{pesanan_id}")
async def detail_pesanan(
    pesanan_id: str,
    desa_id: UUID = Depends(resolusi_desa),
    svc: DermagaLayanan = Depends(_svc),
    pid: UUID = Depends(_wajib_login),
):
    pesanan, items, bmap = await svc.ambil_pesanan(desa_id, pesanan_id)
    return pesanan_detail(pesanan, items, bmap)


@router.post("/pesanan/{pesanan_id}/batal")
async def batal_pesanan(
    pesanan_id: str,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: DermagaLayanan = Depends(_svc),
):
    pesanan = await svc.pesanan.wajib(pesanan_id, desa_id)
    pesanan = await svc.batalkan(konteks, desa_id, pesanan.id)
    return pesanan_ringkas(pesanan)


@router.patch("/pesanan/{pesanan_id}/item/{item_id}/fulfillment")
async def ubah_fulfillment(
    pesanan_id: str,
    item_id: str,
    body: FulfillmentBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: DermagaLayanan = Depends(_svc),
):
    it = await svc.ubah_fulfillment(
        konteks, desa_id, UUID(pesanan_id), UUID(item_id), body.status_fulfillment,
    )
    from app.skema.f2 import pesanan_item
    return {"item": pesanan_item(it)}


@router.post("/pesanan/{pesanan_id}/pembayaran", status_code=201)
async def buat_pembayaran(
    pesanan_id: str,
    body: PembayaranBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: DermagaLayanan = Depends(_svc),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    pesanan = await svc.pesanan.wajib(pesanan_id, desa_id)
    p = await svc.buat_pembayaran(
        konteks, desa_id, pesanan.id, body.metode, idempotency_key=idempotency_key,
    )
    pengaturan = await svc.pengaturan.wajib(desa_id)
    out = pembayaran_dto(p)
    if pengaturan.gateway == "manual":
        instruksi = await penyedia_bayar("manual").instruksi_manual(pesanan.kode_pesanan)
        out["instruksi_qris_statis"] = {"url": instruksi.url, "catatan": instruksi.catatan}
    return {"pembayaran": out}


@router.get("/pembayaran")
async def daftar_pembayaran_antrean(
    status: str | None = "menunggu",
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: DermagaLayanan = Depends(_svc),
):
    rows = await svc.daftar_pembayaran_antrean(konteks, desa_id, status=status)
    return {"item": [pembayaran_dto(p) for p in rows]}


@router.post("/pembayaran/{pembayaran_id}/bukti")
async def unggah_bukti(
    pembayaran_id: str,
    body: BuktiBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: DermagaLayanan = Depends(_svc),
):
    p = await svc.unggah_bukti(konteks, desa_id, UUID(pembayaran_id), UUID(body.bukti_media_id))
    return {"pembayaran": pembayaran_dto(p)}


@router.post("/pembayaran/{pembayaran_id}/konfirmasi-manual")
async def konfirmasi_manual(
    pembayaran_id: str,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: DermagaLayanan = Depends(_svc),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    p = await svc.konfirmasi_manual(konteks, desa_id, UUID(pembayaran_id), idempotency_key=idempotency_key)
    return {"pembayaran": pembayaran_dto(p)}


@router.get("/booking")
async def daftar_booking(
    tanggal: str | None = None,
    status: str | None = None,
    desa_id: UUID = Depends(resolusi_desa),
    svc: DermagaLayanan = Depends(_svc),
):
    from datetime import date as date_cls
    tgl = date_cls.fromisoformat(tanggal) if tanggal else None
    rows = await svc.booking.daftar(desa_id, tanggal=tgl, status=status)
    out = []
    for b in rows:
        slot = await svc.slot.ambil(b.slot_jadwal_id, desa_id)
        out.append(booking_dto(b, slot))
    return {"item": out}


@router.post("/booking/{booking_id}/checkin")
async def checkin_booking(
    booking_id: str,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: DermagaLayanan = Depends(_svc),
):
    bk = await svc.checkin(konteks, desa_id, booking_id)
    slot = await svc.slot.ambil(bk.slot_jadwal_id, desa_id)
    return booking_dto(bk, slot)


@router.post("/booking/{booking_id}/selesai")
async def selesai_booking(
    booking_id: str,
    desa_id: UUID = Depends(resolusi_desa),
    svc: DermagaLayanan = Depends(_svc),
):
    bk = await svc.booking.wajib(booking_id, desa_id)
    it = await svc.item.ambil(bk.pesanan_item_id, desa_id)
    pesanan = await svc.selesaikan_pesanan(desa_id, it.pesanan_id)
    return pesanan_ringkas(pesanan)

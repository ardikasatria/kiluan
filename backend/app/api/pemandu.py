"""Router Pemandu — rule default, model lokal via konfig hardcode (KONTRAK F2 §7)."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_penyimpanan, konteks_saat_ini, resolusi_desa
from app.domain.konteks import Konteks
from app.inti.pemandu import MESIN_AKTIF
from app.layanan.pemandu import PemanduLayanan
from app.skema.f2 import sesi_pemandu_dto

router = APIRouter(prefix="/api/v1/desa/{slug}", tags=["pemandu"])


def _svc(store=Depends(get_penyimpanan)) -> PemanduLayanan:
    return PemanduLayanan(store)


class ItineraryBody(BaseModel):
    durasi_hari: int = 1
    minat: list[str] = []
    budget: float = 0
    tanggal_mulai: str | None = None
    jumlah_orang: int = 1


class EstimasiBody(BaseModel):
    item: list[dict]


class ChatBody(BaseModel):
    pesan: str
    sesi_id: str | None = None


@router.post("/pemandu/itinerary")
async def itinerary(
    body: ItineraryBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PemanduLayanan = Depends(_svc),
):
    sesi = await svc.itinerary(konteks, desa_id, body.model_dump())
    kel = sesi.keluaran or {}
    return {
        "sesi_id": str(sesi.id),
        "itinerary": kel.get("itinerary", []),
        "perkiraan_biaya": kel.get("perkiraan_biaya", 0),
        "model_dipakai": sesi.model_dipakai,
        "mesin_konfig": MESIN_AKTIF,
        "label": "Saran otomatis — verifikasi ketersediaan sebelum booking.",
    }


@router.post("/pemandu/estimasi")
async def estimasi(
    body: EstimasiBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PemanduLayanan = Depends(_svc),
):
    sesi = await svc.estimasi(konteks, desa_id, body.item)
    kel = sesi.keluaran or {}
    return {
        "sesi_id": str(sesi.id),
        "total": kel.get("total", 0),
        "model_dipakai": sesi.model_dipakai,
        "mesin_konfig": MESIN_AKTIF,
    }


@router.post("/pemandu/chat")
async def chat(
    body: ChatBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PemanduLayanan = Depends(_svc),
):
    sid = UUID(body.sesi_id) if body.sesi_id else None
    sesi, _, asisten = await svc.chat(konteks, desa_id, body.pesan, sid)
    return {
        "sesi_id": str(sesi.id),
        "jawaban": asisten.isi,
        "sumber": asisten.sumber or [],
        "model_dipakai": sesi.model_dipakai,
        "mesin_konfig": MESIN_AKTIF,
        "label": "Saran otomatis rule-based — bukan nasihat resmi.",
    }


@router.get("/pemandu/sesi/{sesi_id}")
async def ambil_sesi(
    sesi_id: str,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PemanduLayanan = Depends(_svc),
):
    sesi, riwayat = await svc.ambil_sesi(konteks, desa_id, UUID(sesi_id))
    return sesi_pemandu_dto(sesi, riwayat)

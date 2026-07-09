"""Router referensi — /peran, /kategori (Kontrak API F0)."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_penyimpanan

router = APIRouter(prefix="/api/v1", tags=["referensi"])


@router.get("/peran")
async def daftar_peran(store=Depends(get_penyimpanan)):
    baris = await store.referensi.daftar_peran()
    return {"item": [
        {"kode": p.kode, "nama": p.nama, "scoped_desa": p.scoped_desa} for p in baris
    ]}


@router.get("/kategori")
async def daftar_kategori(store=Depends(get_penyimpanan)):
    baris = await store.referensi.daftar_kategori()
    return {"item": [
        {"id": k.id, "kode": k.kode, "nama": k.nama, "ikon": k.ikon, "urutan": k.urutan}
        for k in baris
    ]}


@router.get("/bidang-usaha")
async def daftar_bidang_usaha(store=Depends(get_penyimpanan)):
    from app.layanan.lencana_warga import LencanaLayanan
    return {"item": await LencanaLayanan(store).daftar_bidang_usaha()}

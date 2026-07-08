"""Router discovery publik lintas-desa (Kontrak API F0 §4.1–4.2)."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.api import bantu
from app.api.deps import get_penyimpanan
from app.layanan.discovery import DiscoveryLayanan

router = APIRouter(prefix="/api/v1/discovery", tags=["discovery"])


@router.get("/desa")
async def daftar_desa(
    q: Optional[str] = None,
    dekat: Optional[str] = None,
    radius_m: Optional[float] = None,
    batas: int = 20,
    kursor: Optional[str] = None,
    store=Depends(get_penyimpanan),
):
    hasil = await DiscoveryLayanan(store).daftar_desa(
        q=q, dekat=bantu.parse_dekat(dekat), radius_m=radius_m, batas=batas, kursor=kursor,
    )
    return {
        "item": [
            {
                "slug": i["desa"].slug,
                "nama": i["desa"].nama,
                "deskripsi": i["desa"].deskripsi,
                "lokasi": bantu.lokasi_dict(i["desa"].lokasi),
                "jarak_m": i["jarak_m"],
            }
            for i in hasil["item"]
        ],
        "meta": hasil["meta"],
    }


@router.get("/destinasi")
async def cari_destinasi(
    desa: Optional[str] = Query(None),
    kategori: Optional[int] = Query(None),
    tag: Optional[str] = None,
    q: Optional[str] = None,
    dekat: Optional[str] = None,
    radius_m: Optional[float] = None,
    batas: int = 20,
    kursor: Optional[str] = None,
    store=Depends(get_penyimpanan),
):
    desa_map = {d.id: d.slug for d in await store.desa.daftar_aktif()}
    hasil = await DiscoveryLayanan(store).cari_destinasi(
        desa_slug=desa, kategori_id=kategori, tag=tag, q=q,
        dekat=bantu.parse_dekat(dekat), radius_m=radius_m, batas=batas, kursor=kursor,
    )
    return {
        "item": [
            {
                **bantu.destinasi_ringkas(i["destinasi"]),
                "desa_slug": desa_map.get(i["destinasi"].desa_id),
                "jarak_m": i["jarak_m"],
            }
            for i in hasil["item"]
        ],
        "meta": hasil["meta"],
    }

"""Router discovery publik lintas-desa."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.api import bantu
from app.api.deps import get_penyimpanan, konteks_saat_ini
from app.layanan.discovery import DiscoveryLayanan
from app.layanan.destinasi import DestinasiLayanan

router = APIRouter(prefix="/api/v1/discovery", tags=["discovery"])


@router.get("/desa")
async def daftar_desa(
    q: Optional[str] = None,
    store=Depends(get_penyimpanan),
):
    baris = await DiscoveryLayanan(store).daftar_desa()
    if q:
        ql = q.lower()
        baris = [d for d in baris if ql in d.nama.lower() or ql in d.slug.lower()]
    return {
        "item": [
            {
                "slug": d.slug,
                "nama": d.nama,
                "deskripsi": d.deskripsi,
                "lokasi": bantu.lokasi_dict(d.lokasi) if d.lokasi else None,
            }
            for d in baris
        ]
    }


@router.get("/destinasi")
async def cari_destinasi(
    desa: Optional[str] = Query(None),
    q: Optional[str] = None,
    dekat: Optional[str] = None,
    radius_m: Optional[float] = None,
    batas: int = 20,
    konteks=Depends(konteks_saat_ini),
    store=Depends(get_penyimpanan),
):
    if desa:
        d = await store.desa.ambil_slug(desa)
        if d is None:
            return {"item": [], "meta": {"kursor_berikutnya": None, "ada_lagi": False, "batas": batas}}
        hasil = await DestinasiLayanan(store).cari(
            konteks, d.id, q=q,
            dekat=bantu.parse_dekat(dekat), radius_m=radius_m, batas=batas,
        )
    else:
        rows = await DiscoveryLayanan(store).cari_destinasi(q=q)
        hasil = {
            "item": [{"destinasi": r, "jarak_m": None} for r in rows[:batas]],
            "meta": {"kursor_berikutnya": None, "ada_lagi": len(rows) > batas, "batas": batas},
        }
    return {
        "item": [
            {**bantu.destinasi_ringkas(i["destinasi"]), "jarak_m": i["jarak_m"]}
            for i in hasil["item"]
        ],
        "meta": hasil["meta"],
    }

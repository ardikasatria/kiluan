"""Router layanan wisata — /desa/{slug}/layanan."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel

from app.api import bantu
from app.api.deps import get_penyimpanan, konteks_saat_ini, resolusi_desa, wajib_peran
from app.domain import rbac
from app.domain.enums import JenisLayanan, SatuanHarga, StatusKonten
from app.layanan.discovery import LayananWisataLayanan

router = APIRouter(prefix="/api/v1/desa/{slug}/layanan", tags=["layanan"])


class LayananBuat(BaseModel):
    nama: str
    jenis: JenisLayanan
    harga: float
    satuan_harga: SatuanHarga
    destinasi_id: Optional[UUID] = None
    penyedia_id: Optional[UUID] = None
    deskripsi: Optional[str] = None
    ketersediaan: Optional[dict] = None
    status: StatusKonten = StatusKonten.draft


class LayananUbah(BaseModel):
    nama: Optional[str] = None
    jenis: Optional[JenisLayanan] = None
    harga: Optional[float] = None
    satuan_harga: Optional[SatuanHarga] = None
    destinasi_id: Optional[UUID] = None
    deskripsi: Optional[str] = None
    ketersediaan: Optional[dict] = None
    status: Optional[StatusKonten] = None


def _svc(store) -> LayananWisataLayanan:
    return LayananWisataLayanan(store)


@router.get("")
async def daftar(
    jenis: Optional[JenisLayanan] = None,
    destinasi_id: Optional[UUID] = None,
    status: Optional[StatusKonten] = None,
    konteks=Depends(konteks_saat_ini),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    baris = await _svc(store).daftar(
        konteks, desa_id, jenis=jenis, destinasi_id=destinasi_id, status=status,
    )
    return {"item": [bantu.layanan_dict(l) for l in baris]}


@router.post("", status_code=201)
async def buat(
    req: LayananBuat,
    konteks=Depends(wajib_peran(rbac.KELOLA_LAYANAN_SENDIRI)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    l = await _svc(store).buat(
        konteks, desa_id,
        nama=req.nama, jenis=req.jenis, harga=req.harga, satuan_harga=req.satuan_harga,
        destinasi_id=req.destinasi_id, penyedia_id=req.penyedia_id, status=req.status,
    )
    return bantu.layanan_dict(l)


@router.patch("/{layanan_id}")
async def ubah(
    layanan_id: UUID,
    req: LayananUbah,
    konteks=Depends(konteks_saat_ini),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    ubah = req.model_dump(exclude_unset=True)
    l = await _svc(store).ubah(konteks, desa_id, layanan_id, **ubah)
    return bantu.layanan_dict(l)


@router.delete("/{layanan_id}", status_code=204)
async def hapus(
    layanan_id: UUID,
    konteks=Depends(konteks_saat_ini),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    await _svc(store).hapus(konteks, desa_id, layanan_id)
    return Response(status_code=204)

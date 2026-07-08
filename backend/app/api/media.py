"""Router media & lampiran — Kontrak API F0 §5.4–5.5."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel

from app.api import bantu
from app.api.deps import get_penyimpanan, resolusi_desa, wajib_peran
from app.domain import rbac
from app.domain.enums import EntitasLampiran, TipeMedia
from app.layanan.media import MediaLayanan

router_media = APIRouter(prefix="/api/v1/desa/{slug}/media", tags=["media"])
router_lampiran = APIRouter(prefix="/api/v1/desa/{slug}/lampiran", tags=["media"])


class PresignReq(BaseModel):
    nama_berkas: str
    mime: str
    ukuran: int


class KonfirmasiReq(BaseModel):
    media_id: UUID
    tipe: TipeMedia
    lebar: Optional[int] = None
    tinggi: Optional[int] = None
    alt: Optional[str] = None


class LampiranBuat(BaseModel):
    media_id: UUID
    entitas_tipe: EntitasLampiran
    entitas_id: UUID
    urutan: int = 0
    utama: bool = False


class LampiranUbah(BaseModel):
    urutan: Optional[int] = None
    utama: Optional[bool] = None


def _svc(store) -> MediaLayanan:
    return MediaLayanan(store)


@router_media.post("/presign")
async def presign(
    req: PresignReq,
    konteks=Depends(wajib_peran(rbac.UNGGAH_MEDIA)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    out = await _svc(store).presign(
        konteks, desa_id, req.nama_berkas, req.mime, req.ukuran,
    )
    return {
        "media_id": str(out["media_id"]),
        "objek_minio": out["objek_minio"],
        "url_unggah": out["url_unggah"],
        "kedaluwarsa_dalam": out["kedaluwarsa_dalam"],
    }


@router_media.post("/konfirmasi", status_code=201)
async def konfirmasi(
    req: KonfirmasiReq,
    konteks=Depends(wajib_peran(rbac.UNGGAH_MEDIA)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    m = await _svc(store).konfirmasi(
        konteks, desa_id, req.media_id, req.tipe,
        lebar=req.lebar, tinggi=req.tinggi, alt=req.alt,
    )
    return bantu.media_dict(m)


@router_media.get("/{media_id}")
async def detail_media(
    media_id: UUID,
    konteks=Depends(wajib_peran(rbac.UNGGAH_MEDIA)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    m = await _svc(store).ambil(konteks, desa_id, media_id)
    return bantu.media_dict(m)


@router_media.delete("/{media_id}", status_code=204)
async def hapus_media(
    media_id: UUID,
    konteks=Depends(wajib_peran(rbac.UNGGAH_MEDIA)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    await _svc(store).hapus_media(konteks, desa_id, media_id)
    return Response(status_code=204)


@router_lampiran.post("", status_code=201)
async def tempel_lampiran(
    req: LampiranBuat,
    konteks=Depends(wajib_peran(rbac.KELOLA_LAMPIRAN)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    l = await _svc(store).tempel(
        konteks, desa_id, req.media_id, req.entitas_tipe, req.entitas_id,
        urutan=req.urutan, utama=req.utama,
    )
    m = await store.media.ambil(l.media_id)
    return bantu.lampiran_dict(l, m)


@router_lampiran.patch("/{lampiran_id}")
async def ubah_lampiran(
    lampiran_id: UUID,
    req: LampiranUbah,
    konteks=Depends(wajib_peran(rbac.KELOLA_LAMPIRAN)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    l = await _svc(store).ubah_lampiran(
        konteks, desa_id, lampiran_id,
        urutan=req.urutan, utama=req.utama,
    )
    m = await store.media.ambil(l.media_id)
    return bantu.lampiran_dict(l, m)


@router_lampiran.delete("/{lampiran_id}", status_code=204)
async def hapus_lampiran(
    lampiran_id: UUID,
    konteks=Depends(wajib_peran(rbac.KELOLA_LAMPIRAN)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    await _svc(store).hapus_lampiran(konteks, desa_id, lampiran_id)
    return Response(status_code=204)

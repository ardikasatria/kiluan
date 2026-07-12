"""Router Warta — berita/blog (KONTRAK addendum F2 §B.1)."""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.deps import get_penyimpanan, pengguna_id_opsional, resolusi_desa
from app.domain.errors import TidakTerautentikasi
from app.domain.konteks import bangun_konteks
from app.layanan.warta import WartaLayanan

router = APIRouter(prefix="/api/v1/desa/{slug}", tags=["berita"])


async def _wajib_login(pengguna_id: Optional[UUID] = Depends(pengguna_id_opsional)) -> UUID:
    if pengguna_id is None:
        raise TidakTerautentikasi("perlu masuk terlebih dahulu")
    return pengguna_id


def _svc(store=Depends(get_penyimpanan)) -> WartaLayanan:
    return WartaLayanan(store)


class BeritaBuat(BaseModel):
    slug: str
    judul: str
    ringkasan: str | None = None
    konten: str = ""
    kategori: str = "lainnya"
    sampul_media_id: UUID | None = None
    sorotan: bool = False


class BeritaUbah(BaseModel):
    slug: str | None = None
    judul: str | None = None
    ringkasan: str | None = None
    konten: str | None = None
    kategori: str | None = None
    sampul_media_id: UUID | None = None
    sorotan: bool | None = None


class BeritaStatusBody(BaseModel):
    aksi: str
    terbit_pada: datetime | None = None


class TagBody(BaseModel):
    tag_id: int


@router.get("/berita")
async def daftar_berita(
    desa_id: UUID = Depends(resolusi_desa),
    kategori: str | None = None,
    status: str | None = None,
    tag: str | None = None,
    sorotan: bool | None = None,
    batas: int = Query(20, ge=1, le=100),
    kursor: str | None = None,
    pengguna_id: Optional[UUID] = Depends(pengguna_id_opsional),
    store=Depends(get_penyimpanan),
    svc: WartaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    return await svc.daftar(
        konteks, desa_id,
        kategori=kategori, status=status, tag=tag, sorotan=sorotan,
        kursor=kursor, batas=batas,
    )


@router.get("/berita/{id_atau_slug}")
async def detail_berita(
    id_atau_slug: str,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: Optional[UUID] = Depends(pengguna_id_opsional),
    store=Depends(get_penyimpanan),
    svc: WartaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    return await svc.detail(konteks, desa_id, id_atau_slug)


@router.post("/berita", status_code=201)
async def buat_berita(
    req: BeritaBuat,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: WartaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    b = await svc.buat(konteks, desa_id, req.model_dump())
    return await svc._dto(b, detail=True, kelola=True)


@router.patch("/berita/{berita_id}")
async def ubah_berita(
    berita_id: UUID,
    req: BeritaUbah,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: WartaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    b = await svc.ubah(konteks, desa_id, berita_id, req.model_dump(exclude_unset=True))
    return await svc._dto(b, detail=True, kelola=True)


@router.patch("/berita/{berita_id}/status")
async def ubah_status_berita(
    berita_id: UUID,
    req: BeritaStatusBody,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: WartaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    b = await svc.ubah_status(konteks, desa_id, berita_id, req.aksi, req.terbit_pada)
    return await svc._dto(b, detail=True, kelola=True)


@router.delete("/berita/{berita_id}", status_code=204)
async def hapus_berita(
    berita_id: UUID,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: WartaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    await svc.hapus(konteks, desa_id, berita_id)


@router.post("/berita/{berita_id}/tag", status_code=201)
async def tempel_tag_berita(
    berita_id: UUID,
    req: TagBody,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: WartaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    b = await svc.tempel_tag(konteks, desa_id, berita_id, req.tag_id)
    return await svc._dto(b, detail=True, kelola=True)


@router.delete("/berita/{berita_id}/tag/{tag_id}", status_code=204)
async def lepas_tag_berita(
    berita_id: UUID,
    tag_id: int,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: WartaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    await svc.lepas_tag(konteks, desa_id, berita_id, tag_id)

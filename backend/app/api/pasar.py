"""Router Pasar Desa — KONTRAK F1 §3."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.api import bantu
from app.api.deps import get_penyimpanan, pengguna_id_opsional, resolusi_desa
from app.domain.konteks import bangun_konteks
from app.domain.enums import JenisProduk, SatuanHarga, StatusProduk
from app.domain.errors import TidakTerautentikasi
from app.layanan.pasar_desa import PasarDesaLayanan

router = APIRouter(prefix="/api/v1/desa/{slug}", tags=["pasar"])


async def _wajib_login(pengguna_id: Optional[UUID] = Depends(pengguna_id_opsional)) -> UUID:
    if pengguna_id is None:
        raise TidakTerautentikasi("perlu masuk terlebih dahulu")
    return pengguna_id


def _svc(store=Depends(get_penyimpanan)) -> PasarDesaLayanan:
    return PasarDesaLayanan(store)


class LokasiBody(BaseModel):
    lat: float
    lng: float


class UmkmBuat(BaseModel):
    bidang_id: int
    nama: str
    deskripsi: str = ""
    telepon: str = ""
    whatsapp: str = ""
    alamat: str = ""
    lokasi: LokasiBody | None = None


class UmkmUbah(BaseModel):
    bidang_id: int | None = None
    nama: str | None = None
    deskripsi: str | None = None
    telepon: str | None = None
    whatsapp: str | None = None
    alamat: str | None = None
    lokasi: LokasiBody | None = None


class VerifikasiBody(BaseModel):
    keputusan: str


class ProdukBuat(BaseModel):
    umkm_id: UUID
    nama: str
    jenis: JenisProduk
    harga: float
    satuan_harga: SatuanHarga
    deskripsi: str = ""
    stok: int | None = None


class ProdukUbah(BaseModel):
    nama: str | None = None
    deskripsi: str | None = None
    harga: float | None = None
    stok: int | None = None


class StatusBody(BaseModel):
    status: StatusProduk


class PaketBuat(BaseModel):
    slug: str
    nama: str
    durasi_jam: int
    harga: float
    satuan_harga: SatuanHarga
    deskripsi: str = ""
    kuota_default: int = 0


class PaketUbah(BaseModel):
    nama: str | None = None
    deskripsi: str | None = None
    durasi_jam: int | None = None
    harga: float | None = None
    kuota_default: int | None = None


class TransisiBody(BaseModel):
    aksi: str
    catatan: str = ""


class ItemBuat(BaseModel):
    hari: int
    urutan: int
    judul: str = ""
    deskripsi: str = ""
    destinasi_id: UUID | None = None
    layanan_id: UUID | None = None
    produk_jasa_id: UUID | None = None
    durasi_menit: int = 0


class ItemUbah(BaseModel):
    hari: int | None = None
    urutan: int | None = None
    judul: str | None = None
    deskripsi: str | None = None
    durasi_menit: int | None = None
    destinasi_id: UUID | None = None
    layanan_id: UUID | None = None
    produk_jasa_id: UUID | None = None


# --- UMKM ---


@router.get("/umkm")
async def daftar_umkm(
    desa_id: UUID = Depends(resolusi_desa),
    bidang: int | None = Query(None, alias="bidang"),
    status: str | None = None,
    dekat: str | None = None,
    radius_m: float | None = None,
    q: str | None = None,
    batas: int = Query(20, ge=1, le=100),
    kursor: str | None = None,
    kelola: bool = False,
    pengguna_id: Optional[UUID] = Depends(pengguna_id_opsional),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    return await svc.daftar_umkm_publik(
        desa_id,
        bidang_id=bidang,
        q=q,
        dekat=bantu.parse_dekat(dekat),
        radius_m=radius_m,
        kursor=kursor,
        batas=batas,
        kelola=kelola,
        konteks=konteks,
        status_verifikasi=status,
    )


@router.get("/umkm/{umkm_id}")
async def detail_umkm(
    umkm_id: UUID,
    desa_id: UUID = Depends(resolusi_desa),
    kelola: bool = False,
    svc: PasarDesaLayanan = Depends(_svc),
):
    return await svc.detail_umkm(desa_id, umkm_id, kelola=kelola)


@router.post("/umkm", status_code=201)
async def buat_umkm(
    req: UmkmBuat,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    umkm = await svc.daftar_umkm(konteks, desa_id, req.model_dump())
    return await svc.detail_umkm(desa_id, umkm.id, kelola=True)


@router.patch("/umkm/{umkm_id}")
async def ubah_umkm(
    umkm_id: UUID,
    req: UmkmUbah,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    await svc.ubah_umkm(konteks, desa_id, umkm_id, req.model_dump(exclude_unset=True))
    return await svc.detail_umkm(desa_id, umkm_id, kelola=True)


@router.patch("/umkm/{umkm_id}/verifikasi")
async def verifikasi_umkm(
    umkm_id: UUID,
    req: VerifikasiBody,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    await svc.verifikasi_umkm(konteks, desa_id, umkm_id, req.keputusan)
    return await svc.detail_umkm(desa_id, umkm_id, kelola=True)


@router.delete("/umkm/{umkm_id}", status_code=204)
async def hapus_umkm(
    umkm_id: UUID,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    await svc.hapus_umkm(konteks, desa_id, umkm_id)


# --- Produk ---


@router.get("/produk")
async def daftar_produk(
    desa_id: UUID = Depends(resolusi_desa),
    umkm_id: UUID | None = None,
    jenis: str | None = None,
    bidang: int | None = None,
    status: str | None = None,
    q: str | None = None,
    batas: int = Query(20, ge=1, le=100),
    kursor: str | None = None,
    kelola: bool = False,
    svc: PasarDesaLayanan = Depends(_svc),
):
    return await svc.daftar_produk_publik(
        desa_id,
        umkm_id=umkm_id,
        jenis=jenis,
        bidang_id=bidang,
        q=q,
        kursor=kursor,
        batas=batas,
        kelola=kelola,
        status=status,
    )


@router.get("/produk/{produk_id}")
async def detail_produk(
    produk_id: UUID,
    desa_id: UUID = Depends(resolusi_desa),
    kelola: bool = False,
    svc: PasarDesaLayanan = Depends(_svc),
):
    return await svc.detail_produk(desa_id, produk_id, kelola=kelola)


@router.post("/produk", status_code=201)
async def buat_produk(
    req: ProdukBuat,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    data = req.model_dump()
    data["jenis"] = req.jenis.value
    data["satuan_harga"] = req.satuan_harga.value
    p = await svc.buat_produk(konteks, desa_id, data)
    return svc._produk_dto(p, await store.umkm.ambil(p.umkm_id))


@router.patch("/produk/{produk_id}")
async def ubah_produk(
    produk_id: UUID,
    req: ProdukUbah,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    p = await svc.ubah_produk(konteks, desa_id, produk_id, req.model_dump(exclude_unset=True))
    return svc._produk_dto(p, await store.umkm.ambil(p.umkm_id))


@router.patch("/produk/{produk_id}/status")
async def ubah_status_produk(
    produk_id: UUID,
    req: StatusBody,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    p = await svc.ubah_status_produk(konteks, desa_id, produk_id, req.status.value)
    return svc._produk_dto(p, await store.umkm.ambil(p.umkm_id))


@router.delete("/produk/{produk_id}", status_code=204)
async def hapus_produk(
    produk_id: UUID,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    await svc.hapus_produk(konteks, desa_id, produk_id)


# --- Paket ---


@router.get("/paket")
async def daftar_paket(
    desa_id: UUID = Depends(resolusi_desa),
    agen_id: UUID | None = None,
    status: str | None = None,
    q: str | None = None,
    batas: int = Query(20, ge=1, le=100),
    kursor: str | None = None,
    kelola: bool = False,
    pengguna_id: Optional[UUID] = Depends(pengguna_id_opsional),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    return await svc.daftar_paket(
        desa_id, agen_id=agen_id, status=status, q=q, kursor=kursor, batas=batas, kelola=kelola,
        konteks=konteks,
    )


@router.get("/paket/{id_atau_slug}")
async def detail_paket(
    id_atau_slug: str,
    desa_id: UUID = Depends(resolusi_desa),
    kelola: bool = False,
    svc: PasarDesaLayanan = Depends(_svc),
):
    return await svc.detail_paket(desa_id, id_atau_slug, kelola=kelola)


@router.post("/paket", status_code=201)
async def buat_paket(
    req: PaketBuat,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    data = req.model_dump()
    data["satuan_harga"] = req.satuan_harga.value
    p = await svc.buat_paket(konteks, desa_id, data)
    return await svc.detail_paket(desa_id, str(p.id), kelola=True)


@router.patch("/paket/{paket_id}")
async def ubah_paket(
    paket_id: UUID,
    req: PaketUbah,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    await svc.ubah_paket(konteks, desa_id, paket_id, req.model_dump(exclude_unset=True))
    return await svc.detail_paket(desa_id, str(paket_id), kelola=True)


@router.post("/paket/{paket_id}/transisi")
async def transisi_paket(
    paket_id: UUID,
    req: TransisiBody,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    await svc.transisi_paket(konteks, desa_id, paket_id, req.aksi, req.catatan)
    return await svc.detail_paket(desa_id, str(paket_id), kelola=True)


@router.delete("/paket/{paket_id}", status_code=204)
async def hapus_paket(
    paket_id: UUID,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    await svc.hapus_paket(konteks, desa_id, paket_id)


@router.post("/paket/{paket_id}/item", status_code=201)
async def tambah_item(
    paket_id: UUID,
    req: ItemBuat,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    item = await svc.tambah_item_paket(konteks, desa_id, paket_id, req.model_dump())
    return await svc._item_dto(item)


@router.patch("/paket/{paket_id}/item/{item_id}")
async def ubah_item(
    paket_id: UUID,
    item_id: UUID,
    req: ItemUbah,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    item = await svc.ubah_item_paket(
        konteks, desa_id, paket_id, item_id, req.model_dump(exclude_unset=True),
    )
    return await svc._item_dto(item)


@router.delete("/paket/{paket_id}/item/{item_id}", status_code=204)
async def hapus_item(
    paket_id: UUID,
    item_id: UUID,
    desa_id: UUID = Depends(resolusi_desa),
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    await svc.hapus_item_paket(konteks, desa_id, paket_id, item_id)


@router.get("/kurasi/log")
async def kurasi_log(
    desa_id: UUID = Depends(resolusi_desa),
    entitas_tipe: str | None = None,
    entitas_id: UUID | None = None,
    batas: int = Query(20, ge=1, le=100),
    kursor: str | None = None,
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
    svc: PasarDesaLayanan = Depends(_svc),
):
    konteks = await bangun_konteks(store, pengguna_id)
    return await svc.daftar_kurasi_log(
        konteks, desa_id, entitas_tipe=entitas_tipe, entitas_id=entitas_id, batas=batas, kursor=kursor,
    )

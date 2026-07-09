"""Router Penjelajah Lestari + verifikasi (KONTRAK F2 §6)."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.deps import get_penyimpanan, konteks_saat_ini, resolusi_desa
from app.domain.konteks import Konteks
from app.layanan.penjelajah import PenjelajahLayanan, _pengelola, _verifikator
from app.repo.f2_sql import _baca_koordinat_stasiun
from app.skema.f2 import (
    misi_detail,
    misi_ringkas,
    paspor_dto,
    stasiun_dto,
    stempel_dto,
    verifikasi_dto,
)

router = APIRouter(prefix="/api/v1/desa/{slug}", tags=["penjelajah"])


def _svc(store=Depends(get_penyimpanan)) -> PenjelajahLayanan:
    return PenjelajahLayanan(store)


class MisiBody(BaseModel):
    kode: str | None = None
    judul: str
    deskripsi: str | None = None
    jenis: str
    kategori: str
    micro_lesson: dict | None = None
    syarat_verifikasi: dict | None = None
    stasiun_id: str | None = None
    poin: int = 0
    dampak_template: dict | None = None
    aktif: bool = True


class MisiUbahBody(BaseModel):
    judul: str | None = None
    deskripsi: str | None = None
    jenis: str | None = None
    kategori: str | None = None
    micro_lesson: dict | None = None
    syarat_verifikasi: dict | None = None
    stasiun_id: str | None = None
    poin: int | None = None
    dampak_template: dict | None = None
    aktif: bool | None = None


class MisiSelesaiBody(BaseModel):
    booking_id: str | None = None
    bukti: dict | None = None
    dampak: dict | None = None


class StasiunBody(BaseModel):
    nama: str
    tipe: str
    lokasi: dict | None = None
    destinasi_id: str | None = None
    radius_m: int = 50
    aktif: bool = True


class StasiunUbahBody(BaseModel):
    nama: str | None = None
    tipe: str | None = None
    lokasi: dict | None = None
    radius_m: int | None = None
    aktif: bool | None = None
    rotasi_qr: bool = False


class PutuskanBody(BaseModel):
    hasil: str
    catatan: str = ""


async def _stasiun_nama_map(svc: PenjelajahLayanan, desa_id: UUID, ids: set[UUID]) -> dict[str, str]:
    if not ids:
        return {}
    rows = await svc.stasiun.daftar(desa_id, aktif_only=False)
    return {str(r.id): r.nama for r in rows if r.id in ids}


@router.get("/misi")
async def daftar_misi(
    desa_id: UUID = Depends(resolusi_desa),
    jenis: str | None = Query(default=None),
    kategori: str | None = Query(default=None),
    stasiun_id: str | None = Query(default=None),
    svc: PenjelajahLayanan = Depends(_svc),
):
    sid = UUID(stasiun_id) if stasiun_id else None
    rows = await svc.daftar_misi(desa_id, jenis=jenis, kategori=kategori, stasiun_id=sid)
    st_ids = {m.stasiun_id for m in rows if m.stasiun_id}
    sn = await _stasiun_nama_map(svc, desa_id, st_ids)
    return {
        "item": [
            misi_ringkas(m, sn.get(str(m.stasiun_id)) if m.stasiun_id else None)
            for m in rows
        ],
    }


@router.get("/misi/{misi_id}")
async def detail_misi(
    misi_id: str,
    desa_id: UUID = Depends(resolusi_desa),
    svc: PenjelajahLayanan = Depends(_svc),
):
    m = await svc.detail_misi(desa_id, misi_id)
    sn = None
    if m.stasiun_id:
        st = await svc.stasiun.ambil(m.stasiun_id, desa_id)
        sn = st.nama if st else None
    return {"misi": misi_detail(m, sn)}


@router.post("/misi", status_code=201)
async def buat_misi(
    body: MisiBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PenjelajahLayanan = Depends(_svc),
):
    m = await svc.buat_misi(konteks, desa_id, body.model_dump())
    return {"misi": misi_detail(m)}


@router.patch("/misi/{misi_id}")
async def ubah_misi(
    misi_id: str,
    body: MisiUbahBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PenjelajahLayanan = Depends(_svc),
):
    m = await svc.ubah_misi(konteks, desa_id, UUID(misi_id), body.model_dump(exclude_unset=True))
    return {"misi": misi_detail(m)}


@router.post("/misi/{misi_id}/selesai", status_code=201)
async def selesai_misi(
    misi_id: str,
    body: MisiSelesaiBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PenjelajahLayanan = Depends(_svc),
):
    bid = UUID(body.booking_id) if body.booking_id else None
    hasil = await svc.selesaikan_misi(
        konteks, desa_id, UUID(misi_id), body.bukti, body.dampak, bid,
    )
    s, v = hasil["stempel"], hasil["verifikasi"]
    return {
        "stempel": stempel_dto(s),
        "verifikasi": verifikasi_dto(v),
    }


@router.get("/stasiun")
async def daftar_stasiun(
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PenjelajahLayanan = Depends(_svc),
):
    tampilkan_qr = _pengelola(konteks, desa_id)
    rows = await svc.daftar_stasiun(desa_id)
    item = []
    for st in rows:
        koord = await _baca_koordinat_stasiun(svc.store.sesi, st.id)
        lat, lng = (koord if koord else (None, None))
        item.append(stasiun_dto(st, lat, lng, tampilkan_qr=tampilkan_qr))
    return {"item": item}


@router.post("/stasiun", status_code=201)
async def buat_stasiun(
    body: StasiunBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PenjelajahLayanan = Depends(_svc),
):
    st = await svc.buat_stasiun(konteks, desa_id, body.model_dump())
    koord = await _baca_koordinat_stasiun(svc.store.sesi, st.id)
    lat, lng = (koord if koord else (None, None))
    return {"stasiun": stasiun_dto(st, lat, lng, tampilkan_qr=True)}


@router.patch("/stasiun/{stasiun_id}")
async def ubah_stasiun(
    stasiun_id: str,
    body: StasiunUbahBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PenjelajahLayanan = Depends(_svc),
):
    st = await svc.ubah_stasiun(
        konteks, desa_id, UUID(stasiun_id), body.model_dump(exclude_unset=True),
    )
    koord = await _baca_koordinat_stasiun(svc.store.sesi, st.id)
    lat, lng = (koord if koord else (None, None))
    return {"stasiun": stasiun_dto(st, lat, lng, tampilkan_qr=True)}


@router.delete("/stasiun/{stasiun_id}", status_code=204)
async def hapus_stasiun(
    stasiun_id: str,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PenjelajahLayanan = Depends(_svc),
):
    await svc.nonaktifkan_stasiun(konteks, desa_id, UUID(stasiun_id))


@router.get("/paspor/saya")
async def paspor_saya(
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PenjelajahLayanan = Depends(_svc),
):
    data = await svc.paspor_saya(konteks, desa_id)
    p, stempel = data["paspor"], data["stempel"]
    misi_ids = {s.misi_id for s in stempel}
    misi_map: dict[str, str] = {}
    for mid in misi_ids:
        m = await svc.misi.ambil(mid, desa_id)
        if m:
            misi_map[str(mid)] = m.judul
    terverifikasi = [s for s in stempel if s.status == "terverifikasi"]
    return paspor_dto(p, terverifikasi, misi_map)


@router.get("/stempel/saya")
async def stempel_saya(
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    status: str | None = Query(default=None),
    svc: PenjelajahLayanan = Depends(_svc),
):
    rows = await svc.stempel_saya(konteks, desa_id, status=status)
    misi_map: dict[str, str] = {}
    for s in rows:
        if str(s.misi_id) not in misi_map:
            m = await svc.misi.ambil(s.misi_id, desa_id)
            if m:
                misi_map[str(s.misi_id)] = m.judul
    return {"item": [stempel_dto(s, misi_map.get(str(s.misi_id))) for s in rows]}


@router.get("/verifikasi")
async def daftar_verifikasi(
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    entitas_tipe: str | None = Query(default=None),
    hasil: str | None = Query(default=None),
    svc: PenjelajahLayanan = Depends(_svc),
):
    rows = await svc.daftar_verifikasi(konteks, desa_id, entitas_tipe, hasil)
    return {"item": [verifikasi_dto(v) for v in rows]}


@router.post("/verifikasi/{verifikasi_id}/putuskan")
async def putuskan_verifikasi(
    verifikasi_id: str,
    body: PutuskanBody,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    svc: PenjelajahLayanan = Depends(_svc),
):
    v = await svc.putuskan_verifikasi(
        konteks, desa_id, UUID(verifikasi_id), body.hasil, body.catatan,
    )
    return {"verifikasi": verifikasi_dto(v)}

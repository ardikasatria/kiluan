"""Router profil desa, tag, dan cuaca BMKG."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api import bantu
from app.api.deps import get_penyimpanan, resolusi_desa
from app.domain.enums import StatusDesa
from app.domain.errors import TidakDitemukan
from app.inti import bmkg
from app.repo.sql import _baca_lokasi_desa

router = APIRouter(prefix="/api/v1/desa/{slug}", tags=["desa"])


@router.get("")
async def profil(slug: str, store=Depends(get_penyimpanan)):
    d = await store.desa.ambil_slug(slug)
    if d is None or d.status != StatusDesa.aktif:
        raise TidakDitemukan("desa tidak ditemukan")
    lokasi = None
    if hasattr(store, "sesi"):
        lokasi = await _baca_lokasi_desa(store.sesi, d.id)
    elif hasattr(d, "lokasi"):
        lokasi = d.lokasi
    return {
        "id": str(d.id),
        "slug": d.slug,
        "nama": d.nama,
        "deskripsi": d.deskripsi,
        "lokasi": bantu.lokasi_dict(lokasi),
        "provinsi": d.provinsi,
        "kabupaten": d.kabupaten,
        "kecamatan": d.kecamatan,
        "pekon": d.pekon,
        "logo": str(d.logo_media_id) if d.logo_media_id else None,
        "warna_primer": d.warna_primer,
    }


@router.get("/tag")
async def daftar_tag(desa_id=Depends(resolusi_desa), store=Depends(get_penyimpanan)):
    baris = await store.tag.daftar(desa_id)
    return {"item": [bantu.tag_dict(t) for t in baris]}


@router.get("/cuaca")
async def cuaca(slug: str, store=Depends(get_penyimpanan)):
    d = await store.desa.ambil_slug(slug)
    if d is None:
        raise TidakDitemukan("desa tidak ditemukan")
    if not getattr(d, "kode_bmkg_adm4", None):
        raise TidakDitemukan("cuaca belum dikonfigurasi untuk desa ini")
    return await bmkg.ambil_cuaca_desa(
        kode_bmkg_adm4=d.kode_bmkg_adm4,
        kode_perairan_bmkg=getattr(d, "kode_perairan_bmkg", None),
    )

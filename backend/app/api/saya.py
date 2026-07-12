"""Router identitas diri — /saya (Kontrak API F0 §3.7)."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.deps import get_penyimpanan, pengguna_id_opsional
from app.domain.errors import KesalahanValidasi, TidakTerautentikasi

router = APIRouter(prefix="/api/v1/saya", tags=["saya"])


async def _wajib_login(pengguna_id: Optional[UUID] = Depends(pengguna_id_opsional)) -> UUID:
    if pengguna_id is None:
        raise TidakTerautentikasi("perlu masuk terlebih dahulu")
    return pengguna_id


async def _serial_profil(p, store) -> dict:
    avatar_url = None
    if p.avatar_media_id:
        m = await store.media.ambil(p.avatar_media_id)
        if m is not None and getattr(m, "url", None):
            avatar_url = m.url
    anggota = await store.keanggotaan.daftar_pengguna(p.id)
    return {
        "id": p.id,
        "nama": p.nama,
        "email": p.email,
        "telepon": p.telepon,
        "status": p.status,
        "email_terverifikasi": p.email_terverifikasi_pada is not None,
        "avatar_url": avatar_url,
        "avatar_media_id": str(p.avatar_media_id) if p.avatar_media_id else None,
        "keanggotaan": [
            {"desa_id": k.desa_id, "peran": k.peran, "status": k.status} for k in anggota
        ],
    }


class PatchProfilReq(BaseModel):
    nama: Optional[str] = Field(None, min_length=1, max_length=120)
    telepon: Optional[str] = Field(None, max_length=32)
    avatar_media_id: Optional[UUID] = None


@router.get("")
async def profil(pengguna_id: UUID = Depends(_wajib_login), store=Depends(get_penyimpanan)):
    p = await store.pengguna.ambil(pengguna_id)
    if p is None:
        raise TidakTerautentikasi("sesi tidak valid")
    return await _serial_profil(p, store)


@router.patch("")
async def ubah_profil(
    req: PatchProfilReq,
    pengguna_id: UUID = Depends(_wajib_login),
    store=Depends(get_penyimpanan),
):
    p = await store.pengguna.ambil(pengguna_id)
    if p is None:
        raise TidakTerautentikasi("sesi tidak valid")
    if req.nama is not None:
        nama = req.nama.strip()
        if not nama:
            raise KesalahanValidasi("nama tidak boleh kosong", [{"field": "nama", "pesan": "wajib diisi"}])
        p.nama = nama
    if req.telepon is not None:
        p.telepon = req.telepon.strip() or None
    if req.avatar_media_id is not None:
        m = await store.media.ambil(req.avatar_media_id)
        if m is None:
            raise KesalahanValidasi("media avatar tidak ditemukan", [{"field": "avatar_media_id", "pesan": "tidak valid"}])
        if not getattr(m, "dikonfirmasi", False):
            raise KesalahanValidasi("media belum dikonfirmasi", [{"field": "avatar_media_id", "pesan": "belum dikonfirmasi"}])
        p.avatar_media_id = req.avatar_media_id
    return await _serial_profil(p, store)


@router.get("/keanggotaan")
async def keanggotaan(pengguna_id: UUID = Depends(_wajib_login), store=Depends(get_penyimpanan)):
    anggota = await store.keanggotaan.daftar_pengguna(pengguna_id)
    return {"item": [
        {"id": k.id, "desa_id": k.desa_id, "peran": k.peran, "status": k.status} for k in anggota
    ]}

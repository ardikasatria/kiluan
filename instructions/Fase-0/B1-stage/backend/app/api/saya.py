"""Router identitas diri — /saya (Kontrak API F0 §3.7)."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import get_penyimpanan, pengguna_id_opsional
from app.domain.errors import TidakTerautentikasi

router = APIRouter(prefix="/api/v1/saya", tags=["saya"])


async def _wajib_login(pengguna_id: Optional[UUID] = Depends(pengguna_id_opsional)) -> UUID:
    if pengguna_id is None:
        raise TidakTerautentikasi("perlu masuk terlebih dahulu")
    return pengguna_id


@router.get("")
async def profil(pengguna_id: UUID = Depends(_wajib_login), store=Depends(get_penyimpanan)):
    p = await store.pengguna.ambil(pengguna_id)
    if p is None:
        raise TidakTerautentikasi("sesi tidak valid")
    anggota = await store.keanggotaan.daftar_pengguna(pengguna_id)
    return {
        "id": p.id, "nama": p.nama, "email": p.email, "status": p.status,
        "keanggotaan": [
            {"desa_id": k.desa_id, "peran": k.peran, "status": k.status} for k in anggota
        ],
    }


@router.get("/keanggotaan")
async def keanggotaan(pengguna_id: UUID = Depends(_wajib_login), store=Depends(get_penyimpanan)):
    anggota = await store.keanggotaan.daftar_pengguna(pengguna_id)
    return {"item": [
        {"id": k.id, "desa_id": k.desa_id, "peran": k.peran, "status": k.status} for k in anggota
    ]}

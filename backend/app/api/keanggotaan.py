"""Router keanggotaan tenant — /desa/{slug}/keanggotaan (Kontrak API F0 §3)."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_penyimpanan, konteks_saat_ini, resolusi_desa
from app.domain import rbac
from app.domain.enums import KodePeran, StatusKeanggotaan
from app.layanan.keanggotaan import KeanggotaanLayanan

router = APIRouter(prefix="/api/v1/desa/{slug}/keanggotaan", tags=["keanggotaan"])


class AjukanReq(BaseModel):
    peran: KodePeran


class PutusanReq(BaseModel):
    status: StatusKeanggotaan


def _svc(store) -> KeanggotaanLayanan:
    return KeanggotaanLayanan(store)


@router.post("", status_code=201)
async def ajukan(req: AjukanReq, konteks=Depends(konteks_saat_ini),
                 desa_id: UUID = Depends(resolusi_desa), store=Depends(get_penyimpanan)):
    k = await _svc(store).ajukan(konteks, desa_id, req.peran)
    return {"id": k.id, "peran": k.peran, "status": k.status}


@router.get("")
async def daftar(peran: Optional[KodePeran] = None, status: Optional[StatusKeanggotaan] = None,
                 konteks=Depends(konteks_saat_ini), desa_id: UUID = Depends(resolusi_desa),
                 store=Depends(get_penyimpanan)):
    baris = await _svc(store).daftar(konteks, desa_id, peran=peran, status=status)
    return {"item": [
        {"id": k.id, "pengguna_id": k.pengguna_id, "peran": k.peran, "status": k.status}
        for k in baris
    ]}


@router.patch("/{keanggotaan_id}")
async def putuskan(keanggotaan_id: UUID, req: PutusanReq, konteks=Depends(konteks_saat_ini),
                   desa_id: UUID = Depends(resolusi_desa), store=Depends(get_penyimpanan)):
    k = await _svc(store).putuskan(konteks, desa_id, keanggotaan_id, req.status)
    return {"id": k.id, "peran": k.peran, "status": k.status}

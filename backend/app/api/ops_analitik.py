"""API ops — Anjungan Data (job global)."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_penyimpanan, konteks_saat_ini
from app.domain.konteks import Konteks
from app.f3.enums import Lapisan
from app.layanan.agregat import AgregatLayanan
from app.repo.sql import Penyimpanan
from app.skema.analitik import JalankanAnalitik

router = APIRouter(prefix="/api/v1/ops/analitik", tags=["ops-analitik"])


def _svc(store: Penyimpanan) -> AgregatLayanan:
    return AgregatLayanan(store)


def _job_dto(j) -> dict:
    return {
        "id": str(j.id),
        "desa_id": str(j.desa_id) if j.desa_id else None,
        "lapisan": j.lapisan,
        "nama_job": j.nama_job,
        "status": j.status,
        "baris_masuk": j.baris_masuk,
        "baris_keluar": j.baris_keluar,
        "mulai_pada": j.mulai_pada.isoformat() if j.mulai_pada else None,
        "selesai_pada": j.selesai_pada.isoformat() if j.selesai_pada else None,
        "galat": j.galat,
    }


@router.post("/jalankan")
async def post_jalankan(
    body: JalankanAnalitik,
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    desa_id = UUID(body.desa_id) if body.desa_id else None
    if body.lapisan != Lapisan.gold.value:
        from app.domain.errors import KesalahanValidasi
        raise KesalahanValidasi("Hanya lapisan gold didukung di PkM.")
    j = await _svc(store).jalankan_gold(konteks, desa_id)
    return {"job": _job_dto(j)}


@router.get("/job")
async def get_job_daftar(
    lapisan: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    desa_id: Optional[UUID] = Query(default=None),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    rows = await _svc(store).daftar_job(konteks, lapisan=lapisan, status=status, desa_id=desa_id)
    return {"item": [_job_dto(j) for j in rows]}


@router.get("/job/{job_id}")
async def get_job_detail(
    job_id: UUID,
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    j = await _svc(store).detail_job(konteks, job_id)
    return {"job": _job_dto(j)}

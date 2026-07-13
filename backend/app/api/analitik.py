"""API F3 — Anjungan Data (agregat & laporan tenant)."""
from __future__ import annotations

from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_penyimpanan, konteks_saat_ini, resolusi_desa
from app.domain.konteks import Konteks
from app.layanan.agregat import AgregatLayanan
from app.layanan.laporan import LaporanLayanan
from app.repo.sql import Penyimpanan
from app.skema.analitik import LaporanBuat, LaporanTransisi

router = APIRouter(prefix="/api/v1/desa/{slug}", tags=["anjungan"])


def _svc_agregat(store: Penyimpanan) -> AgregatLayanan:
    return AgregatLayanan(store)


def _svc_laporan(store: Penyimpanan) -> LaporanLayanan:
    return LaporanLayanan(store)


def _agregat_dto(r) -> dict:
    return {
        "tanggal": r.tanggal.isoformat(),
        "kode_metrik": r.kode_metrik,
        "dimensi": r.dimensi or {},
        "nilai": float(r.nilai),
        "diperbarui_pada": r.diperbarui_pada.isoformat() if r.diperbarui_pada else None,
    }


def _laporan_dto(l) -> dict:
    return {
        "id": str(l.id),
        "periode": l.periode,
        "status": l.status,
        "ringkasan": l.ringkasan or {},
        "file_media_id": str(l.file_media_id) if l.file_media_id else None,
        "dibuat_pada": l.dibuat_pada.isoformat() if l.dibuat_pada else None,
    }


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


@router.get("/agregat")
async def get_agregat(
    slug: str,
    kode_metrik: str = Query(...),
    dari: date = Query(...),
    sampai: date = Query(...),
    dimensi: Optional[str] = Query(default=None),
    konteks: Konteks = Depends(konteks_saat_ini),
    desa_id: UUID = Depends(resolusi_desa),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    dim: dict | None = None
    if dimensi:
        dim = {}
        for part in dimensi.split(","):
            if ":" in part:
                k, v = part.split(":", 1)
                dim[k.strip()] = v.strip()
    rows = await _svc_agregat(store).baca(konteks, desa_id, kode_metrik, dari, sampai, dim)
    return {"item": [_agregat_dto(r) for r in rows]}


@router.get("/agregat/ringkas")
async def get_agregat_ringkas(
    slug: str,
    periode: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    konteks: Konteks = Depends(konteks_saat_ini),
    desa_id: UUID = Depends(resolusi_desa),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    data = await _svc_agregat(store).ringkas(konteks, desa_id, periode)
    return data


@router.get("/laporan")
async def get_laporan_daftar(
    slug: str,
    periode: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    konteks: Konteks = Depends(konteks_saat_ini),
    desa_id: UUID = Depends(resolusi_desa),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    rows = await _svc_laporan(store).daftar(konteks, desa_id, periode=periode, status=status)
    return {"item": [_laporan_dto(r) for r in rows]}


@router.get("/laporan/{periode}")
async def get_laporan_detail(
    slug: str,
    periode: str,
    konteks: Konteks = Depends(konteks_saat_ini),
    desa_id: UUID = Depends(resolusi_desa),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    lap = await _svc_laporan(store).detail(konteks, desa_id, periode)
    return {"laporan": _laporan_dto(lap)}


@router.post("/laporan")
async def post_laporan(
    slug: str,
    body: LaporanBuat,
    konteks: Konteks = Depends(konteks_saat_ini),
    desa_id: UUID = Depends(resolusi_desa),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    lap = await _svc_laporan(store).generate(konteks, desa_id, body.periode)
    return {"laporan": _laporan_dto(lap)}


@router.post("/laporan/{laporan_id}/transisi")
async def post_laporan_transisi(
    slug: str,
    laporan_id: UUID,
    body: LaporanTransisi,
    konteks: Konteks = Depends(konteks_saat_ini),
    desa_id: UUID = Depends(resolusi_desa),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    if body.aksi != "finalkan":
        from app.domain.errors import TransisiIlegal
        raise TransisiIlegal("Aksi tidak dikenal.")
    lap = await _svc_laporan(store).finalkan(konteks, desa_id, laporan_id)
    return {"laporan": _laporan_dto(lap)}


@router.post("/analitik/jalankan")
async def post_jalankan_gold_tenant(
    slug: str,
    konteks: Konteks = Depends(konteks_saat_ini),
    desa_id: UUID = Depends(resolusi_desa),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    """Trigger gold job untuk desa ini (steward/admin)."""
    j = await _svc_agregat(store).jalankan_gold(konteks, desa_id)
    return {"job": _job_dto(j)}

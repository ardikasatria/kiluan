"""API F3 — Jejak Lestari (monitoring + dana konservasi)."""
from __future__ import annotations

from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query

from app.api.deps import get_penyimpanan, konteks_saat_ini, resolusi_desa
from app.domain.konteks import Konteks
from app.layanan.dana_konservasi import DanaKonservasiLayanan
from app.layanan.kapasitas import KapasitasLayanan
from app.layanan.monitoring import MonitoringLayanan
from app.layanan.neraca_lestari import NeracaLestariLayanan
from app.repo.sql import Penyimpanan
from app.skema.lestari import (
    DanaCatat,
    DayaDukungUpsert,
    IndikatorBuat,
    IndikatorUbah,
    KapasitasHitung,
    MonitoringCatat,
    MonitoringSync,
    NeracaHitung,
)

router = APIRouter(prefix="/api/v1/desa/{slug}", tags=["lestari"])


def _svc_mon(store: Penyimpanan) -> MonitoringLayanan:
    return MonitoringLayanan(store)


def _svc_dana(store: Penyimpanan) -> DanaKonservasiLayanan:
    return DanaKonservasiLayanan(store)


def _svc_kap(store: Penyimpanan) -> KapasitasLayanan:
    return KapasitasLayanan(store)


def _svc_neraca(store: Penyimpanan) -> NeracaLestariLayanan:
    return NeracaLestariLayanan(store)


def _indikator_dto(ind) -> dict:
    return {
        "id": ind.id,
        "kode": ind.kode,
        "nama": ind.nama,
        "satuan": ind.satuan,
        "arah_baik": ind.arah_baik,
        "deskripsi": ind.deskripsi,
        "aktif": ind.aktif,
        "lingkup": "template" if ind.desa_id is None else "desa",
    }


def _monitoring_dto(m, ind=None, *, publik: bool = False) -> dict:
    d = {
        "id": str(m.id),
        "indikator": _indikator_dto(ind) if ind else {"id": m.indikator_id},
        "destinasi_id": str(m.destinasi_id) if m.destinasi_id else None,
        "nilai": float(m.nilai),
        "waktu_ukur": m.waktu_ukur.isoformat(),
        "metode": m.metode,
        "status": m.status,
        "catatan": m.catatan,
        "dibuat_pada": m.dibuat_pada.isoformat() if m.dibuat_pada else None,
    }
    if not publik:
        d["pencatat_id"] = str(m.pencatat_id)
    if m.media_id:
        d["media_id"] = str(m.media_id)
    return d


def _dana_dto(e, *, publik: bool = False) -> dict:
    d = {
        "id": str(e.id),
        "jenis": e.jenis,
        "jumlah": float(e.jumlah),
        "keterangan": e.keterangan,
        "tanggal": e.tanggal.isoformat(),
        "dibuat_pada": e.dibuat_pada.isoformat() if e.dibuat_pada else None,
    }
    if e.sumber_tipe:
        d["sumber_tipe"] = e.sumber_tipe
    if e.kategori:
        d["kategori"] = e.kategori
    if e.bukti_media_id:
        d["bukti_media_id"] = str(e.bukti_media_id)
    if not publik:
        d["dicatat_oleh_id"] = str(e.dicatat_oleh)
    return d


@router.get("/indikator")
async def daftar_indikator(
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    rows = await _svc_mon(store).daftar_indikator(konteks, desa_id)
    return {"item": [_indikator_dto(r) for r in rows]}


@router.post("/indikator", status_code=201)
async def buat_indikator(
    body: IndikatorBuat,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    ind = await _svc_mon(store).buat_indikator(konteks, desa_id, body.model_dump())
    return {"indikator": _indikator_dto(ind)}


@router.patch("/indikator/{indikator_id}")
async def ubah_indikator(
    indikator_id: int,
    body: IndikatorUbah,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    ind = await _svc_mon(store).ubah_indikator(
        konteks, desa_id, indikator_id, body.model_dump(exclude_unset=True),
    )
    return {"indikator": _indikator_dto(ind)}


@router.get("/monitoring")
async def daftar_monitoring(
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
    indikator_id: int | None = Query(default=None),
    destinasi_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    milik: str | None = Query(default=None),
    dari: date | None = Query(default=None),
    sampai: date | None = Query(default=None),
):
    svc = _svc_mon(store)
    rows = await svc.daftar(
        konteks, desa_id,
        indikator_id=indikator_id,
        destinasi_id=UUID(destinasi_id) if destinasi_id else None,
        status=status,
        milik=milik,
        dari=dari,
        sampai=sampai,
    )
    ind_map = {i.id: i for i in await svc.indikator.daftar(desa_id, aktif_only=False)}
    return {"item": [_monitoring_dto(m, ind_map.get(m.indikator_id)) for m in rows]}


@router.post("/monitoring", status_code=201)
async def catat_monitoring(
    body: MonitoringCatat,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    hasil = await _svc_mon(store).catat(konteks, desa_id, body.model_dump())
    m = hasil["monitoring"]
    ind = await _svc_mon(store).indikator.ambil(desa_id, m.indikator_id)
    return {
        "monitoring": _monitoring_dto(m, ind),
        "verifikasi": {"id": str(hasil["verifikasi"].id), "hasil": hasil["verifikasi"].hasil},
    }


@router.post("/monitoring/sync")
async def sync_monitoring(
    body: MonitoringSync,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    hasil = await _svc_mon(store).sync(
        konteks, desa_id, [p.model_dump() for p in body.pembacaan],
    )
    return {
        "hasil": [
            {
                "id": str(h.id),
                "status": h.status,
                "verifikasi_id": str(h.verifikasi_id) if h.verifikasi_id else None,
                "galat": {"kode": h.galat} if h.galat else None,
            }
            for h in hasil
        ],
    }


@router.get("/monitoring/{monitoring_id}")
async def detail_monitoring(
    monitoring_id: str,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    svc = _svc_mon(store)
    m = await svc.detail(konteks, desa_id, UUID(monitoring_id))
    ind = await svc.indikator.ambil(desa_id, m.indikator_id)
    return {"monitoring": _monitoring_dto(m, ind)}


@router.get("/dana-konservasi/saldo")
async def saldo_dana(desa_id: UUID = Depends(resolusi_desa), store: Penyimpanan = Depends(get_penyimpanan)):
    return await _svc_dana(store).saldo(desa_id)


@router.get("/dana-konservasi")
async def daftar_dana(
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
    jenis: str | None = Query(default=None),
    kategori: str | None = Query(default=None),
    dari: date | None = Query(default=None),
    sampai: date | None = Query(default=None),
    publik: bool = Query(default=False),
):
    rows = await _svc_dana(store).daftar(
        konteks if not publik else None,
        desa_id,
        jenis=jenis,
        kategori=kategori,
        dari=dari,
        sampai=sampai,
        publik=publik,
    )
    return {"item": [_dana_dto(e, publik=publik) for e in rows]}


@router.get("/dana-konservasi/{entri_id}")
async def detail_dana(
    entri_id: str,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
    publik: bool = Query(default=False),
):
    e = await _svc_dana(store).detail(
        konteks if not publik else None, desa_id, UUID(entri_id), publik=publik,
    )
    return {"entri": _dana_dto(e, publik=publik)}


@router.post("/dana-konservasi", status_code=201)
async def catat_dana(
    body: DanaCatat,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    e = await _svc_dana(store).catat(
        konteks, desa_id, body.model_dump(), idempotency_key=idempotency_key,
    )
    return {"entri": _dana_dto(e)}


def _daya_dukung_dto(dd) -> dict:
    return {
        "destinasi_id": str(dd.destinasi_id),
        "kapasitas_harian": dd.kapasitas_harian,
        "ambang_kuning": float(dd.ambang_kuning),
        "ambang_merah": float(dd.ambang_merah),
        "metode_hitung": dd.metode_hitung,
        "diperbarui_pada": dd.diperbarui_pada.isoformat() if dd.diperbarui_pada else None,
    }


def _kapasitas_dto(pk, *, publik: bool = False) -> dict:
    d = {
        "destinasi_id": str(pk.destinasi_id),
        "tanggal": pk.tanggal.isoformat(),
        "rasio": float(pk.rasio),
        "level": pk.level,
        "dihitung_pada": pk.dihitung_pada.isoformat() if pk.dihitung_pada else None,
    }
    if not publik:
        d["kunjungan"] = pk.kunjungan
        d["kapasitas_harian"] = pk.kapasitas_harian
    return d


def _neraca_dto(n, *, publik: bool = False) -> dict:
    d = {
        "periode": n.periode,
        "skor_ekologi": float(n.skor_ekologi),
        "skor_sosial": float(n.skor_sosial),
        "skor_ekonomi": float(n.skor_ekonomi),
        "skor_total": float(n.skor_total),
        "dibuat_pada": n.dibuat_pada.isoformat() if n.dibuat_pada else None,
    }
    if publik:
        komp = n.komponen or {}
        d["komponen_ringkas"] = {
            "klaim_diklaim": komp.get("klaim_dampak_diklaim", 0),
            "klaim_tervalidasi": komp.get("klaim_dampak_tervalidasi", 0),
            "indikator_terverifikasi": len(komp.get("indikator_terverifikasi", [])),
        }
    else:
        d["komponen"] = n.komponen
        d["terkunci"] = n.terkunci
    return d


@router.get("/daya-dukung")
async def daftar_daya_dukung(
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    rows = await _svc_kap(store).daftar_daya_dukung(konteks, desa_id)
    return {"item": [_daya_dukung_dto(r) for r in rows]}


@router.put("/daya-dukung/{destinasi_id}")
async def upsert_daya_dukung(
    destinasi_id: str,
    body: DayaDukungUpsert,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    dd = await _svc_kap(store).upsert_daya_dukung(
        konteks, desa_id, UUID(destinasi_id), body.model_dump(),
    )
    return {"daya_dukung": _daya_dukung_dto(dd)}


@router.get("/kapasitas")
async def daftar_kapasitas(
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
    destinasi_id: str | None = Query(default=None),
    dari: date | None = Query(default=None),
    sampai: date | None = Query(default=None),
    publik: bool = Query(default=False),
):
    rows = await _svc_kap(store).daftar_kapasitas(
        konteks if not publik else None,
        desa_id,
        destinasi_id=UUID(destinasi_id) if destinasi_id else None,
        dari=dari,
        sampai=sampai,
        publik=publik,
    )
    return {"item": [_kapasitas_dto(r, publik=publik) for r in rows]}


@router.get("/kapasitas/hari-ini")
async def kapasitas_hari_ini(
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
    publik: bool = Query(default=True),
):
    rows = await _svc_kap(store).hari_ini(
        konteks if not publik else None, desa_id, publik=publik,
    )
    return {"item": [_kapasitas_dto(r, publik=publik) for r in rows]}


@router.post("/kapasitas/hitung", status_code=202)
async def hitung_kapasitas(
    body: KapasitasHitung,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    rows = await _svc_kap(store).trigger_hitung(konteks, desa_id, body.tanggal)
    return {"item": [_kapasitas_dto(r) for r in rows]}


@router.get("/neraca")
async def daftar_neraca(
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
    dari: str | None = Query(default=None),
    sampai: str | None = Query(default=None),
    publik: bool = Query(default=False),
):
    rows = await _svc_neraca(store).daftar(
        konteks if not publik else None, desa_id, dari=dari, sampai=sampai, publik=publik,
    )
    return {"item": [_neraca_dto(r, publik=publik) for r in rows]}


@router.get("/neraca/{periode}")
async def detail_neraca(
    periode: str,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
    publik: bool = Query(default=False),
):
    n = await _svc_neraca(store).detail(
        konteks if not publik else None, desa_id, periode, publik=publik,
    )
    return {"neraca": _neraca_dto(n, publik=publik)}


@router.post("/neraca/hitung", status_code=202)
async def hitung_neraca(
    body: NeracaHitung,
    desa_id: UUID = Depends(resolusi_desa),
    konteks: Konteks = Depends(konteks_saat_ini),
    store: Penyimpanan = Depends(get_penyimpanan),
):
    n = await _svc_neraca(store).hitung(konteks, desa_id, body.periode)
    return {"neraca": _neraca_dto(n)}

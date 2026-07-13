"""Skema API F3 — Jejak Lestari."""
from __future__ import annotations

from datetime import date
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class LokasiBody(BaseModel):
    lat: float
    lng: float


class IndikatorBuat(BaseModel):
    kode: str
    nama: str
    satuan: str
    arah_baik: str = "naik"
    deskripsi: str = ""


class IndikatorUbah(BaseModel):
    nama: Optional[str] = None
    satuan: Optional[str] = None
    arah_baik: Optional[str] = None
    deskripsi: Optional[str] = None
    aktif: Optional[bool] = None


class MonitoringCatat(BaseModel):
    id: Optional[str] = None
    indikator_id: int
    destinasi_id: Optional[str] = None
    nilai: float
    waktu_ukur: date
    metode: str
    media_id: Optional[str] = None
    lokasi: Optional[LokasiBody] = None
    catatan: str = ""


class MonitoringSync(BaseModel):
    pembacaan: list[MonitoringCatat]


class DanaCatat(BaseModel):
    jenis: str
    jumlah: float
    tanggal: date
    kategori: Optional[str] = None
    sumber_tipe: Optional[str] = None
    keterangan: str = ""
    bukti_media_id: Optional[str] = None


class DayaDukungUpsert(BaseModel):
    kapasitas_harian: int
    ambang_kuning: float
    ambang_merah: float
    metode_hitung: str = "booking+checkin"


class KapasitasHitung(BaseModel):
    tanggal: Optional[date] = None


class NeracaHitung(BaseModel):
    periode: str = Field(pattern=r"^\d{4}-\d{2}$")

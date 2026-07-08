"""Skema Pydantic v2 umum (DTO lintas modul)."""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, field_validator


class Lokasi(BaseModel):
    lat: float
    lng: float

    @field_validator("lat")
    @classmethod
    def _cek_lat(cls, v: float) -> float:
        if not -90.0 <= v <= 90.0:
            raise ValueError("lat harus di rentang -90..90")
        return v

    @field_validator("lng")
    @classmethod
    def _cek_lng(cls, v: float) -> float:
        if not -180.0 <= v <= 180.0:
            raise ValueError("lng harus di rentang -180..180")
        return v


class MetaPaginasi(BaseModel):
    kursor_berikutnya: Optional[str] = None
    ada_lagi: bool = False
    batas: int = 20


class RincianGalat(BaseModel):
    field: str
    pesan: str


class Galat(BaseModel):
    kode: str
    pesan: str
    rincian: list[RincianGalat] = []


class AmplopGalat(BaseModel):
    galat: Galat

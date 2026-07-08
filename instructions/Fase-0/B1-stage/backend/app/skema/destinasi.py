"""Skema request untuk Balai Warga (auth) & Destinasi Kiluan."""
from __future__ import annotations

import re
from typing import Optional

from pydantic import BaseModel, field_validator

from ..domain.enums import StatusKonten
from .umum import Lokasi

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class DaftarReq(BaseModel):
    email: str
    nama: str
    kata_sandi: str
    telepon: Optional[str] = None

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("format email tidak valid")
        return v

    @field_validator("kata_sandi")
    @classmethod
    def _sandi(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("kata sandi minimal 8 karakter")
        return v


class MasukReq(BaseModel):
    email: str
    kata_sandi: str

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return v.strip().lower()


class DestinasiBuat(BaseModel):
    nama: str
    slug: str
    kategori_id: int
    lokasi: Lokasi
    deskripsi: Optional[str] = None
    area: Optional[dict] = None
    alamat: Optional[str] = None
    jam_operasional: Optional[dict] = None
    status: StatusKonten = StatusKonten.draft

    @field_validator("slug")
    @classmethod
    def _slug(cls, v: str) -> str:
        if not _SLUG_RE.match(v):
            raise ValueError("slug harus kebab-case (a-z, 0-9, tanda hubung)")
        return v


class DestinasiUbah(BaseModel):
    nama: Optional[str] = None
    deskripsi: Optional[str] = None
    kategori_id: Optional[int] = None
    lokasi: Optional[Lokasi] = None
    alamat: Optional[str] = None
    jam_operasional: Optional[dict] = None

"""Entitas domain sebagai dataclasses ringan.

Ini representasi baris untuk repo in-memory & service (agar teruji tanpa DB).
Skema persisten sesungguhnya ada di `app/model/` (SQLAlchemy, untuk Alembic).
Field `urut` = surrogate UUIDv7 untuk keyset (lihat util.urut()).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID

from .enums import (
    EntitasLampiran,
    JenisLayanan,
    KodePeran,
    SatuanHarga,
    StatusDesa,
    StatusKeanggotaan,
    StatusKonten,
    StatusPengguna,
    TipeMedia,
    TipeToken,
)
from .util import uid, urut


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class Desa:
    slug: str
    nama: str
    status: StatusDesa = StatusDesa.aktif
    deskripsi: Optional[str] = None
    lokasi: Optional[tuple[float, float]] = None  # (lat, lng)
    provinsi: Optional[str] = None
    kabupaten: Optional[str] = None
    kecamatan: Optional[str] = None
    pekon: Optional[str] = None
    logo_media_id: Optional[UUID] = None
    warna_primer: Optional[str] = None
    id: UUID = field(default_factory=uid)
    urut: int = field(default_factory=urut)
    dibuat_pada: datetime = field(default_factory=_now)


@dataclass
class Pengguna:
    email: str
    nama: str
    kata_sandi_hash: str
    telepon: Optional[str] = None
    avatar_media_id: Optional[UUID] = None
    status: StatusPengguna = StatusPengguna.pending
    email_terverifikasi_pada: Optional[datetime] = None
    login_terakhir: Optional[datetime] = None
    id: UUID = field(default_factory=uid)
    urut: int = field(default_factory=urut)
    dibuat_pada: datetime = field(default_factory=_now)


@dataclass
class Keanggotaan:
    pengguna_id: UUID
    peran: KodePeran
    desa_id: Optional[UUID] = None  # None = global (mis. admin)
    status: StatusKeanggotaan = StatusKeanggotaan.menunggu
    id: UUID = field(default_factory=uid)
    urut: int = field(default_factory=urut)
    dibuat_pada: datetime = field(default_factory=_now)


@dataclass
class TokenAuth:
    pengguna_id: UUID
    tipe: TipeToken
    token_hash: str
    kedaluwarsa_pada: datetime
    dipakai_pada: Optional[datetime] = None
    id: UUID = field(default_factory=uid)
    dibuat_pada: datetime = field(default_factory=_now)


@dataclass
class Kategori:
    kode: str
    nama: str
    ikon: Optional[str] = None
    urutan: int = 0
    id: int = 0


@dataclass
class Tag:
    kode: str
    nama: str
    desa_id: Optional[UUID] = None  # None = global
    id: int = 0


@dataclass
class Destinasi:
    desa_id: UUID
    slug: str
    nama: str
    kategori_id: int
    lokasi: tuple[float, float]  # (lat, lng) — wajib
    deskripsi: Optional[str] = None
    area: Optional[dict] = None
    alamat: Optional[str] = None
    daya_dukung_harian: Optional[int] = None  # slot F3
    jam_operasional: Optional[dict] = None
    status: StatusKonten = StatusKonten.draft
    dibuat_oleh: Optional[UUID] = None
    tag_kode: list[str] = field(default_factory=list)
    dihapus_pada: Optional[datetime] = None
    id: UUID = field(default_factory=uid)
    urut: int = field(default_factory=urut)
    dibuat_pada: datetime = field(default_factory=_now)


@dataclass
class Layanan:
    desa_id: UUID
    nama: str
    jenis: JenisLayanan
    harga: float
    satuan_harga: SatuanHarga
    destinasi_id: Optional[UUID] = None
    deskripsi: Optional[str] = None
    ketersediaan: Optional[dict] = None
    penyedia_id: Optional[UUID] = None
    status: StatusKonten = StatusKonten.draft
    dihapus_pada: Optional[datetime] = None
    id: UUID = field(default_factory=uid)
    urut: int = field(default_factory=urut)
    dibuat_pada: datetime = field(default_factory=_now)


@dataclass
class Media:
    desa_id: UUID
    objek_minio: str
    tipe: TipeMedia
    url: Optional[str] = None
    mime: Optional[str] = None
    ukuran: Optional[int] = None
    lebar: Optional[int] = None
    tinggi: Optional[int] = None
    alt: Optional[str] = None
    diunggah_oleh: Optional[UUID] = None
    dikonfirmasi: bool = False
    id: UUID = field(default_factory=uid)
    urut: int = field(default_factory=urut)
    dibuat_pada: datetime = field(default_factory=_now)


@dataclass
class Lampiran:
    media_id: UUID
    entitas_tipe: EntitasLampiran
    entitas_id: UUID
    urutan: int = 0
    utama: bool = False
    id: UUID = field(default_factory=uid)
    urut: int = field(default_factory=urut)

"""Dataclass domain F1 (ERD §3)."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID

from .ids import sekarang, uid, urut


@dataclass
class BidangUsaha:
    kode: str
    nama: str
    ikon: str = ""
    id: int | None = None


@dataclass
class Umkm:
    desa_id: UUID
    pengguna_id: UUID
    bidang_id: int
    nama: str
    deskripsi: str = ""
    telepon: str = ""
    whatsapp: str = ""
    alamat: str = ""
    lokasi: dict | None = None
    status_verifikasi: str = "menunggu"
    diverifikasi_oleh: UUID | None = None
    id: UUID = field(default_factory=uid)
    urut: int = field(default_factory=urut)
    dibuat_pada: datetime = field(default_factory=sekarang)
    diperbarui_pada: datetime = field(default_factory=sekarang)
    dihapus_pada: datetime | None = None


@dataclass
class ProdukJasa:
    desa_id: UUID
    umkm_id: UUID
    nama: str
    jenis: str
    harga: float
    satuan_harga: str
    deskripsi: str = ""
    stok: int | None = None
    status: str = "draft"
    id: UUID = field(default_factory=uid)
    urut: int = field(default_factory=urut)
    dibuat_pada: datetime = field(default_factory=sekarang)
    diperbarui_pada: datetime = field(default_factory=sekarang)
    dihapus_pada: datetime | None = None


@dataclass
class PaketWisata:
    desa_id: UUID
    agen_id: UUID
    slug: str
    nama: str
    durasi_jam: int
    harga: float
    satuan_harga: str
    deskripsi: str = ""
    kuota_default: int = 0
    status: str = "draft"
    id: UUID = field(default_factory=uid)
    urut: int = field(default_factory=urut)
    dibuat_pada: datetime = field(default_factory=sekarang)
    diperbarui_pada: datetime = field(default_factory=sekarang)
    dihapus_pada: datetime | None = None


@dataclass
class PaketItem:
    paket_id: UUID
    hari: int
    urutan: int
    judul: str = ""
    deskripsi: str = ""
    destinasi_id: UUID | None = None
    layanan_id: UUID | None = None
    produk_jasa_id: UUID | None = None
    durasi_menit: int = 0
    id: UUID = field(default_factory=uid)
    urut: int = field(default_factory=urut)


@dataclass
class Kontribusi:
    desa_id: UUID
    penyumbang_id: UUID
    tipe: str
    target_tipe: str
    muatan: dict = field(default_factory=dict)
    target_id: UUID | None = None
    media_id: UUID | None = None
    status: str = "menunggu"
    id: UUID = field(default_factory=uid)
    urut: int = field(default_factory=urut)
    dibuat_pada: datetime = field(default_factory=sekarang)
    diperbarui_pada: datetime = field(default_factory=sekarang)


@dataclass
class KurasiLog:
    entitas_tipe: str
    entitas_id: UUID
    dari_status: str
    ke_status: str
    kurator_id: UUID
    keputusan: str
    catatan: str = ""
    id: UUID = field(default_factory=uid)
    urut: int = field(default_factory=urut)
    dibuat_pada: datetime = field(default_factory=sekarang)


@dataclass
class AturanPoin:
    kode_aksi: str
    poin: int
    deskripsi: str = ""
    desa_id: UUID | None = None
    aktif: bool = True
    id: int | None = None


@dataclass
class TransaksiPoin:
    desa_id: UUID
    pengguna_id: UUID
    kode_aksi: str
    poin: int
    aturan_id: int | None = None
    referensi_tipe: str | None = None
    referensi_id: UUID | None = None
    id: UUID = field(default_factory=uid)
    urut: int = field(default_factory=urut)
    dibuat_pada: datetime = field(default_factory=sekarang)


@dataclass
class Badge:
    kode: str
    nama: str
    deskripsi: str = ""
    ikon: str = ""
    tingkat: int = 1
    syarat: dict = field(default_factory=dict)
    desa_id: UUID | None = None
    aktif: bool = True
    id: int | None = None


@dataclass
class BadgePengguna:
    pengguna_id: UUID
    badge_id: int
    id: UUID = field(default_factory=uid)
    diperoleh_pada: datetime = field(default_factory=sekarang)


@dataclass
class KartuAksi:
    kode: str
    nama: str
    deskripsi: str = ""
    kenapa_penting: str = ""
    bukti_dibutuhkan: dict = field(default_factory=dict)
    bobot: int = 10
    desa_id: UUID | None = None
    aktif: bool = True
    id: int | None = None


@dataclass
class PengajuanKartu:
    desa_id: UUID
    subjek_tipe: str
    subjek_id: UUID
    kartu_id: int
    bukti: dict = field(default_factory=dict)
    status: str = "menunggu"
    validator_id: UUID | None = None
    catatan: str = ""
    id: UUID = field(default_factory=uid)
    urut: int = field(default_factory=urut)
    dibuat_pada: datetime = field(default_factory=sekarang)
    divalidasi_pada: datetime | None = None


@dataclass
class SertifikasiOwner:
    desa_id: UUID
    subjek_tipe: str
    subjek_id: UUID
    tingkat: str
    skor: int
    id: UUID = field(default_factory=uid)
    diperbarui_pada: datetime = field(default_factory=sekarang)


@dataclass
class Destinasi:
    """Stub F0 untuk validasi referensi paket_item."""
    desa_id: UUID
    nama: str
    slug: str = ""
    id: UUID = field(default_factory=uid)
    dihapus_pada: datetime | None = None


@dataclass
class Layanan:
    """Stub F0 untuk validasi referensi paket_item."""
    desa_id: UUID
    nama: str
    id: UUID = field(default_factory=uid)
    dihapus_pada: datetime | None = None

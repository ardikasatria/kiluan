"""Model domain F3 (dataclass murni, tanpa I/O).

Field snake_case persis ERD. Entitas ringkas F0–F2 (Transaksi/Booking/Stempel)
disertakan seadanya untuk menguji hook lintas-fase.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from .enums import (
    ArahBaik, HasilVerifikasi, JenisDana, KategoriDana, KodeMetrik, Lapisan,
    LevelKapasitas, MetodeMonitoring, SumberDana, StatusJob, StatusLaporan,
    StatusMonitoring,
)


# ---------- Jejak Lestari ----------
@dataclass
class IndikatorEkologi:
    id: int
    desa_id: Optional[UUID]  # None = template global
    kode: str
    nama: str
    satuan: str
    arah_baik: ArahBaik
    deskripsi: str = ""
    aktif: bool = True

    @property
    def lingkup(self) -> str:
        return "template" if self.desa_id is None else "desa"


@dataclass
class MonitoringEkologi:
    id: UUID
    desa_id: UUID
    indikator_id: int
    destinasi_id: Optional[UUID]
    nilai: float
    waktu_ukur: date
    pencatat_id: UUID
    metode: MetodeMonitoring
    status: StatusMonitoring
    media_id: Optional[UUID] = None
    catatan: str = ""
    lokasi: Optional[tuple] = None  # (lat, lng)
    dibuat_pada: Optional[datetime] = None


@dataclass
class DayaDukung:
    id: UUID
    desa_id: UUID
    destinasi_id: UUID
    kapasitas_harian: int
    ambang_kuning: float  # rasio 0..1
    ambang_merah: float
    metode_hitung: str = "booking+checkin"
    diperbarui_pada: Optional[datetime] = None


@dataclass
class PemakaianKapasitas:
    id: UUID
    desa_id: UUID
    destinasi_id: UUID
    tanggal: date
    kunjungan: int
    kapasitas_harian: int
    rasio: float
    level: LevelKapasitas
    dihitung_pada: Optional[datetime] = None

    def publik(self) -> dict:
        # subset transparansi: kunjungan mentah disembunyikan
        return {"destinasi_id": str(self.destinasi_id), "tanggal": self.tanggal.isoformat(),
                "rasio": round(self.rasio, 4), "level": self.level.value}


@dataclass
class DanaKonservasi:
    id: UUID
    desa_id: UUID
    jenis: JenisDana
    jumlah: float
    tanggal: date
    dicatat_oleh: UUID
    sumber_tipe: Optional[SumberDana] = None
    sumber_id: Optional[UUID] = None
    kategori: Optional[KategoriDana] = None
    keterangan: str = ""
    bukti_media_id: Optional[UUID] = None
    dibuat_pada: Optional[datetime] = None


@dataclass
class NeracaRegeneratif:
    id: UUID
    desa_id: UUID
    periode: str  # YYYY-MM
    skor_ekologi: float
    skor_sosial: float
    skor_ekonomi: float
    skor_total: float
    komponen: dict = field(default_factory=dict)
    terkunci: bool = False
    dibuat_pada: Optional[datetime] = None


# ---------- Anjungan Data ----------
@dataclass
class Peristiwa:
    id: UUID
    desa_id: UUID
    jenis: str
    muatan: dict
    terjadi_pada: datetime
    diproses_pada: Optional[datetime] = None  # kursor ETL


@dataclass
class JobAnalitik:
    id: UUID
    desa_id: Optional[UUID]  # None = global
    lapisan: Lapisan
    nama_job: str
    status: StatusJob
    baris_masuk: int = 0
    baris_keluar: int = 0
    mulai_pada: Optional[datetime] = None
    selesai_pada: Optional[datetime] = None
    galat: Optional[str] = None


@dataclass
class AgregatHarian:
    id: UUID
    desa_id: UUID
    tanggal: date
    kode_metrik: KodeMetrik
    dimensi: dict
    nilai: float
    diperbarui_pada: Optional[datetime] = None


@dataclass
class LaporanBulanan:
    id: UUID
    desa_id: UUID
    periode: str
    ringkasan: dict
    status: StatusLaporan
    file_media_id: Optional[UUID] = None
    dibuat_pada: Optional[datetime] = None


@dataclass
class Verifikasi:
    id: UUID
    desa_id: UUID
    entitas_tipe: str
    entitas_id: UUID
    metode: str
    hasil: HasilVerifikasi
    verifikator_id: Optional[UUID] = None
    dibuat_pada: Optional[datetime] = None
    diputuskan_pada: Optional[datetime] = None


# ---------- ringkas F2 (untuk hook lintas-fase & uji) ----------
@dataclass
class Transaksi:
    id: UUID
    desa_id: UUID
    penyedia_tipe: str
    penyedia_id: UUID
    bruto: float
    porsi_reinvestasi: float
    neto_penyedia: float
    tanggal: date
    lokal: bool = True  # penyedia lokal desa


@dataclass
class Booking:
    id: UUID
    desa_id: UUID
    destinasi_id: UUID
    tanggal_kunjungan: date
    jumlah_orang: int
    status: str  # 'selesai' dst


@dataclass
class Stempel:
    id: UUID
    desa_id: UUID
    pengguna_id: UUID
    indikator_kode: str  # klaim dampak dipetakan ke indikator (mis. 'mangrove_survival')
    dampak: dict         # mis. {"mangrove": 5}
    status: StatusMonitoring  # pakai enum status yg sama utk 'terverifikasi'

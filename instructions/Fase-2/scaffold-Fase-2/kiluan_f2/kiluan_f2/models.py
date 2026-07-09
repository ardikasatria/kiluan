"""Entitas domain F2 (dataclass). Uang = Decimal (rupiah bulat). Semua ber-desa_id."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Any

from .clock import id_baru


def _rp(v) -> Decimal:
    return Decimal(str(v))


# ---- Aktor & pengaturan ----
@dataclass
class Aktor:
    pengguna_id: str
    peran: frozenset = field(default_factory=frozenset)

    def punya(self, *roles) -> bool:
        return bool(self.peran.intersection(roles))


@dataclass
class PengaturanDesa:
    desa_id: str
    persen_reinvestasi: Decimal = _rp("0.10")
    persen_fee_platform: Decimal = _rp("0.02")
    batas_hold_menit: int = 30
    gateway: str = "manual"  # midtrans|xendit|manual
    kebijakan_pembatalan: dict = field(default_factory=dict)

    @property
    def id(self) -> str:
        return self.desa_id


# ---- Katalog minimal (warisan F1) untuk snapshot & resolusi penyedia ----
@dataclass
class ProdukJasa:
    id: str
    desa_id: str
    umkm_id: str  # penyedia_tipe=umkm
    nama: str
    harga: Decimal
    stok: int | None = None  # None = tak terbatas
    satuan: str = "pcs"


@dataclass
class PaketWisata:
    id: str
    desa_id: str
    agen_id: str  # penyedia_tipe=pengguna
    nama: str
    harga: Decimal
    kuota_default: int = 10


# ---- Dermaga commerce ----
@dataclass
class SlotJadwal:
    id: str
    desa_id: str
    subjek_tipe: str
    subjek_id: str
    tanggal: str
    kuota: int
    kuota_terpakai: int = 0
    harga_override: Decimal | None = None
    waktu_mulai: str | None = None
    status: str = "buka"

    @property
    def sisa(self) -> int:
        return self.kuota - self.kuota_terpakai


@dataclass
class PesananItem:
    id: str
    desa_id: str
    pesanan_id: str
    item_tipe: str
    item_id: str
    penyedia_tipe: str
    penyedia_id: str
    nama_snapshot: str
    harga_snapshot: Decimal
    jumlah: int
    subtotal: Decimal
    satuan: str = "pcs"
    slot_jadwal_id: str | None = None
    status_fulfillment: str = "menunggu"
    metadata: dict = field(default_factory=dict)


@dataclass
class Pesanan:
    id: str
    desa_id: str
    pembeli_id: str
    kode_pesanan: str
    dibuat_pada: datetime
    kedaluwarsa_pada: datetime
    metode_ambil: str = "ambil_ditempat"
    alamat_kirim: dict | None = None
    kontak: dict = field(default_factory=dict)
    kupon_id: str | None = None
    subtotal: Decimal = _rp(0)
    diskon: Decimal = _rp(0)
    ongkir: Decimal = _rp(0)
    total: Decimal = _rp(0)
    status: str = "menunggu_pembayaran"
    item: list = field(default_factory=list)


@dataclass
class Booking:
    id: str
    desa_id: str
    pesanan_item_id: str
    slot_jadwal_id: str
    kode_checkin: str
    tanggal_kunjungan: str
    jumlah_orang: int
    destinasi_id: str | None = None
    status: str = "dipesan"
    checkin_pada: datetime | None = None


@dataclass
class Pembayaran:
    id: str
    desa_id: str
    pesanan_id: str
    metode: str
    penyedia_gateway: str
    jumlah: Decimal
    kedaluwarsa_pada: datetime
    status: str = "menunggu"
    ref_eksternal: str | None = None
    redirect_url: str | None = None
    bukti_media_id: str | None = None
    dibayar_pada: datetime | None = None


@dataclass
class WebhookPembayaran:
    id: str
    penyedia_gateway: str
    event_id: str
    ref_eksternal: str
    jenis_event: str
    status_proses: str = "diterima"


@dataclass
class Transaksi:
    id: str
    desa_id: str
    pesanan_id: str
    pembayaran_id: str | None
    penyedia_tipe: str
    penyedia_id: str
    jenis: str
    bruto: Decimal
    fee_platform: Decimal
    porsi_reinvestasi: Decimal
    neto_penyedia: Decimal
    status: str
    dibuat_pada: datetime
    payout_id: str | None = None


@dataclass
class RekeningPenyedia:
    id: str
    desa_id: str
    penyedia_tipe: str
    penyedia_id: str
    jenis: str
    nomor: str
    nama_pemilik: str
    bank_kode: str | None = None
    terverifikasi: bool = False
    utama: bool = True

    @property
    def nomor_mask(self) -> str:
        return "••••" + self.nomor[-4:]


@dataclass
class Payout:
    id: str
    desa_id: str
    penyedia_tipe: str
    penyedia_id: str
    rekening_id: str
    jumlah: Decimal
    metode: str
    dibuat_pada: datetime
    status: str = "antri"
    ref_eksternal: str | None = None
    catatan: str = ""
    diproses_pada: datetime | None = None


@dataclass
class Refund:
    id: str
    desa_id: str
    pesanan_id: str
    pemohon_id: str
    alasan: str
    jumlah: Decimal
    dibuat_pada: datetime
    pesanan_item_id: str | None = None
    status: str = "diajukan"
    selesai_pada: datetime | None = None


# ---- Kupon & poin ----
@dataclass
class TransaksiPoin:
    id: str
    desa_id: str
    pengguna_id: str
    kode_aksi: str
    poin: int
    referensi_tipe: str | None = None
    referensi_id: str | None = None


@dataclass
class KatalogHadiah:
    id: str
    nama: str
    jenis: str
    biaya_poin: int
    desa_id: str | None = None  # None = global
    stok: int | None = None
    syarat: dict = field(default_factory=dict)
    aktif: bool = True
    kode: str = ""


@dataclass
class PenukaranPoin:
    id: str
    desa_id: str
    pengguna_id: str
    hadiah_id: str
    poin_dipakai: int
    dibuat_pada: datetime
    kupon_id: str | None = None
    status: str = "berhasil"


@dataclass
class Kupon:
    id: str
    desa_id: str
    kode: str
    sumber: str
    tipe_diskon: str
    nilai: Decimal
    batas_pakai: int
    dibuat_pada: datetime
    pemilik_id: str | None = None
    min_belanja: Decimal | None = None
    terpakai: int = 0
    penyedia_terbatas: list | None = None  # daftar "tipe:id"
    berlaku_mulai: datetime | None = None
    berlaku_sampai: datetime | None = None
    status: str = "aktif"


@dataclass
class PemakaianKupon:
    id: str
    kupon_id: str
    pesanan_id: str
    pengguna_id: str
    jumlah_diskon: Decimal


# ---- Penjelajah Lestari ----
@dataclass
class StasiunLestari:
    id: str
    desa_id: str
    nama: str
    tipe: str
    qr_token: str
    lat: float
    lng: float
    radius_m: int = 50
    destinasi_id: str | None = None
    aktif: bool = True


@dataclass
class Misi:
    id: str
    desa_id: str | None
    kode: str
    judul: str
    jenis: str  # belajar|aksi
    kategori: str
    poin: int
    syarat_verifikasi: dict = field(default_factory=dict)  # {metode, radius_m, bukti:{foto:bool}}
    stasiun_id: str | None = None
    dampak_template: dict = field(default_factory=dict)
    micro_lesson: dict | None = None
    aktif: bool = True


@dataclass
class PasporLestari:
    id: str
    desa_id: str
    pengguna_id: str
    diperbarui_pada: datetime
    ringkasan_dampak: dict = field(default_factory=dict)
    total_stempel: int = 0


@dataclass
class Stempel:
    id: str
    desa_id: str
    paspor_id: str
    misi_id: str
    dampak: dict
    dibuat_pada: datetime
    booking_id: str | None = None
    stasiun_id: str | None = None
    lat: float | None = None
    lng: float | None = None
    media_id: str | None = None
    status: str = "menunggu_verifikasi"


@dataclass
class Verifikasi:
    id: str
    desa_id: str
    entitas_tipe: str
    entitas_id: str
    metode: str
    dibuat_pada: datetime
    verifikator_id: str | None = None
    hasil: str = "menunggu"
    diputuskan_pada: datetime | None = None


# ---- Pemandu ----
@dataclass
class SesiPemandu:
    id: str
    desa_id: str
    tipe: str
    masukan: dict
    dibuat_pada: datetime
    pengguna_id: str | None = None
    keluaran: dict | None = None
    model_dipakai: str = "rule"
    percakapan: list = field(default_factory=list)


def kode_pesanan_baru() -> str:
    return "KLN-" + id_baru("")[-6:].upper()

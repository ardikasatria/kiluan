"""Enum F2 (ERD §4) sebagai frozenset + konstanta peran. Enforcement lewat CHECK di DB
nanti; di scaffold ini divalidasi service."""
from __future__ import annotations

# Peran (aktor)
WISATAWAN = "wisatawan"
UMKM = "umkm"
AGEN = "agen"
POKDARWIS = "pokdarwis"
PERANGKAT = "perangkat_desa"
ADMIN = "admin"

PENGELOLA = frozenset({POKDARWIS, PERANGKAT, ADMIN})
BENDAHARA = PENGELOLA  # yang boleh konfirmasi bayar / payout
VERIFIKATOR = frozenset({AGEN, POKDARWIS, PERANGKAT, ADMIN})

# Enum kolom (subset yang dipakai scaffold)
PESANAN_STATUS = frozenset(
    {"menunggu_pembayaran", "dibayar", "diproses", "selesai", "dibatalkan", "kedaluwarsa", "refund"}
)
ITEM_TIPE = frozenset({"produk_jasa", "paket_wisata", "layanan", "tiket_masuk"})
PENYEDIA_TIPE = frozenset({"umkm", "pengguna"})
SLOT_STATUS = frozenset({"buka", "tutup", "penuh"})
BOOKING_STATUS = frozenset({"dipesan", "terkonfirmasi", "checkin", "selesai", "noshow", "batal"})
PEMBAYARAN_METODE = frozenset({"qris", "va_bank", "ewallet", "kartu", "transfer_manual"})
GATEWAY = frozenset({"midtrans", "xendit", "manual"})
PEMBAYARAN_STATUS = frozenset(
    {"menunggu", "diproses", "berhasil", "gagal", "kedaluwarsa", "refund_sebagian", "refund_penuh"}
)
TRANSAKSI_JENIS = frozenset({"penjualan", "refund", "penyesuaian"})
TRANSAKSI_STATUS = frozenset({"tertahan_escrow", "dirilis", "direfund", "sebagian_refund"})
PAYOUT_STATUS = frozenset({"antri", "diproses", "berhasil", "gagal"})
REFUND_STATUS = frozenset({"diajukan", "disetujui", "ditolak", "diproses", "selesai"})
HADIAH_JENIS = frozenset({"kupon_diskon", "merchandise", "tiket", "donasi"})
KUPON_TIPE = frozenset({"persen", "nominal"})
KUPON_STATUS = frozenset({"aktif", "nonaktif", "habis", "kedaluwarsa"})
MISI_JENIS = frozenset({"belajar", "aksi"})
VERIF_METODE = frozenset({"qr_checkin", "foto_geotag", "konfirmasi_pemandu", "otomatis"})
VERIF_HASIL = frozenset({"menunggu", "valid", "invalid"})

"""Enum domain Fase 0 — nilai persis mengikuti ERD_Kiluan_Fase0.md.

Enum ditegakkan di level aplikasi (bukan ENUM native Postgres) agar mudah
menambah nilai tanpa migrasi berat; di DB dijaga lewat CHECK/lookup.
"""
from enum import Enum


class StatusDesa(str, Enum):
    draft = "draft"
    aktif = "aktif"
    nonaktif = "nonaktif"


class StatusPengguna(str, Enum):
    pending = "pending"
    aktif = "aktif"
    nonaktif = "nonaktif"
    tersuspensi = "tersuspensi"


class KodePeran(str, Enum):
    wisatawan = "wisatawan"
    pokdarwis = "pokdarwis"
    umkm = "umkm"
    agen = "agen"
    kontributor = "kontributor"
    organisasi = "organisasi"
    perangkat_desa = "perangkat_desa"
    admin = "admin"


class StatusKeanggotaan(str, Enum):
    aktif = "aktif"
    menunggu = "menunggu"
    ditolak = "ditolak"
    nonaktif = "nonaktif"


class TipeToken(str, Enum):
    penyegar = "penyegar"
    verifikasi_email = "verifikasi_email"
    reset_sandi = "reset_sandi"


class StatusKonten(str, Enum):
    """Dipakai destinasi & layanan (draft | publikasi | arsip)."""
    draft = "draft"
    publikasi = "publikasi"
    arsip = "arsip"


class JenisLayanan(str, Enum):
    transportasi = "transportasi"
    pemandu = "pemandu"
    penginapan = "penginapan"
    sewa_alat = "sewa_alat"
    kuliner = "kuliner"
    tiket_masuk = "tiket_masuk"
    lainnya = "lainnya"


class SatuanHarga(str, Enum):
    per_orang = "per_orang"
    per_paket = "per_paket"
    per_malam = "per_malam"
    per_unit = "per_unit"
    per_jam = "per_jam"


class TipeKalender(str, Enum):
    harian = "harian"
    musiman = "musiman"
    event = "event"


class StatusKalender(str, Enum):
    aktif = "aktif"
    nonaktif = "nonaktif"


class TipeMedia(str, Enum):
    foto = "foto"
    video = "video"


class EntitasLampiran(str, Enum):
    destinasi = "destinasi"
    layanan = "layanan"
    desa = "desa"
    pengguna = "pengguna"

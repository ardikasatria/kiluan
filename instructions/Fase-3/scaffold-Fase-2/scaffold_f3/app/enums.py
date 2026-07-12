"""Enum F3 — nilai ditegakkan di aplikasi + CHECK constraint (bukan ENUM native PG).

Sesuai ERD_Kiluan_Fase3.md §4. snake_case Bahasa Indonesia.
"""
from __future__ import annotations
from enum import Enum


class ArahBaik(str, Enum):
    naik = "naik"
    turun = "turun"


class MetodeMonitoring(str, Enum):
    survei_lapangan = "survei_lapangan"
    sensor = "sensor"
    laporan_warga = "laporan_warga"
    pihak_ketiga = "pihak_ketiga"


class StatusMonitoring(str, Enum):
    menunggu_verifikasi = "menunggu_verifikasi"
    terverifikasi = "terverifikasi"
    ditolak = "ditolak"


class LevelKapasitas(str, Enum):
    hijau = "hijau"
    kuning = "kuning"
    merah = "merah"


class JenisDana(str, Enum):
    masuk = "masuk"
    keluar = "keluar"


class SumberDana(str, Enum):
    transaksi = "transaksi"
    donasi = "donasi"
    hibah = "hibah"
    lainnya = "lainnya"


class KategoriDana(str, Enum):
    rehabilitasi_karang = "rehabilitasi_karang"
    penanaman_mangrove = "penanaman_mangrove"
    pengelolaan_sampah = "pengelolaan_sampah"
    edukasi = "edukasi"
    operasional = "operasional"
    lainnya = "lainnya"


class JenisPeristiwa(str, Enum):
    booking_selesai = "booking_selesai"
    transaksi_settle = "transaksi_settle"
    stempel_terverifikasi = "stempel_terverifikasi"
    monitoring_terverifikasi = "monitoring_terverifikasi"
    kartu_tervalidasi = "kartu_tervalidasi"
    kontribusi_disetujui = "kontribusi_disetujui"


class Lapisan(str, Enum):
    bronze = "bronze"
    silver = "silver"
    gold = "gold"


class StatusJob(str, Enum):
    berjalan = "berjalan"
    sukses = "sukses"
    gagal = "gagal"


class KodeMetrik(str, Enum):
    kunjungan = "kunjungan"
    pendapatan = "pendapatan"
    booking_selesai = "booking_selesai"
    transaksi_langsung = "transaksi_langsung"
    umkm_aktif = "umkm_aktif"
    kontribusi = "kontribusi"
    adopsi_regeneratif = "adopsi_regeneratif"
    booking_per_tingkat = "booking_per_tingkat"


class StatusLaporan(str, Enum):
    draf = "draf"
    final = "final"


class HasilVerifikasi(str, Enum):
    menunggu = "menunggu"
    valid = "valid"
    invalid = "invalid"


# entitas_tipe verifikasi (diperluas dari F2)
ENTITAS_MONITORING = "monitoring_ekologi"

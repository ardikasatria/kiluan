"""RBAC F0 — matriks (peran x aksi). Lihat Kontrak API F0 §6.

Peran global `admin` (desa_id=None) melewati semua scope. Peran lain dicek
per-desa lewat keanggotaan aktif di Konteks. Kepemilikan resource (mis. layanan
milik sendiri) dicek terpisah di service, bukan di sini.
"""
from __future__ import annotations

from .enums import KodePeran

# --- Aksi ---
BACA_PUBLIK = "baca_publik"
AJUKAN_KEANGGOTAAN = "ajukan_keanggotaan"
KELOLA_KEANGGOTAAN = "kelola_keanggotaan"
KELOLA_DESTINASI = "kelola_destinasi"          # buat/ubah/hapus
PUBLIKASI_DESTINASI = "publikasi_destinasi"
KELOLA_LAYANAN_SENDIRI = "kelola_layanan_sendiri"
KELOLA_LAYANAN_DESA = "kelola_layanan_desa"
KELOLA_KALENDER = "kelola_kalender"
UNGGAH_MEDIA = "unggah_media"
KELOLA_LAMPIRAN = "kelola_lampiran"

# F3 — Jejak Lestari
BACA_LESTARI_PUBLIK = "baca_lestari_publik"
CATAT_MONITORING = "catat_monitoring"
BACA_MONITORING_PENGELOLA = "baca_monitoring_pengelola"
KELOLA_INDIKATOR = "kelola_indikator"
CATAT_DANA_KONSERVASI = "catat_dana_konservasi"
BACA_DANA_PENGELOLA = "baca_dana_pengelola"
KELOLA_DAYA_DUKUNG = "kelola_daya_dukung"
BACA_KAPASITAS_PENGELOLA = "baca_kapasitas_pengelola"
HITUNG_KAPASITAS = "hitung_kapasitas"
BACA_NERACA_PUBLIK = "baca_neraca_publik"
BACA_NERACA_PENGELOLA = "baca_neraca_pengelola"
HITUNG_NERACA = "hitung_neraca"
BACA_AGREGAT_PENGELOLA = "baca_agregat_pengelola"
BACA_AGREGAT_OWNER = "baca_agregat_owner"
KELOLA_LAPORAN = "kelola_laporan"
JALANKAN_JOB_ANALITIK = "jalankan_job_analitik"
BACA_JOB_ANALITIK = "baca_job_analitik"

_PENGELOLA = {KodePeran.kontributor, KodePeran.perangkat_desa, KodePeran.admin}
_PENCATAT = {KodePeran.kontributor, KodePeran.agen, KodePeran.perangkat_desa, KodePeran.admin}
_BENDAHARA = {KodePeran.kontributor, KodePeran.perangkat_desa, KodePeran.admin}
_SEMUA = set(KodePeran)

MATRIKS: dict[str, set] = {
    BACA_PUBLIK: _SEMUA,
    AJUKAN_KEANGGOTAAN: _SEMUA,
    KELOLA_KEANGGOTAAN: set(_PENGELOLA),
    KELOLA_DESTINASI: set(_PENGELOLA),
    PUBLIKASI_DESTINASI: set(_PENGELOLA),
    KELOLA_LAYANAN_DESA: set(_PENGELOLA),
    KELOLA_KALENDER: set(_PENGELOLA),
    KELOLA_LAYANAN_SENDIRI: {KodePeran.umkm, KodePeran.agen} | _PENGELOLA,
    UNGGAH_MEDIA: {KodePeran.wisatawan, KodePeran.kontributor, KodePeran.umkm, KodePeran.agen} | _PENGELOLA,
    KELOLA_LAMPIRAN: {KodePeran.umkm, KodePeran.agen} | _PENGELOLA,
    BACA_LESTARI_PUBLIK: _SEMUA,
    CATAT_MONITORING: set(_PENCATAT),
    BACA_MONITORING_PENGELOLA: set(_PENGELOLA),
    KELOLA_INDIKATOR: set(_PENGELOLA),
    CATAT_DANA_KONSERVASI: set(_BENDAHARA),
    BACA_DANA_PENGELOLA: set(_PENGELOLA),
    KELOLA_DAYA_DUKUNG: set(_PENGELOLA),
    BACA_KAPASITAS_PENGELOLA: set(_PENGELOLA),
    HITUNG_KAPASITAS: {KodePeran.admin} | set(_PENGELOLA),
    BACA_NERACA_PUBLIK: _SEMUA,
    BACA_NERACA_PENGELOLA: set(_PENGELOLA),
    HITUNG_NERACA: {KodePeran.admin} | set(_PENGELOLA),
    BACA_AGREGAT_PENGELOLA: set(_PENGELOLA),
    BACA_AGREGAT_OWNER: {KodePeran.umkm, KodePeran.agen} | set(_PENGELOLA),
    KELOLA_LAPORAN: {KodePeran.perangkat_desa, KodePeran.admin} | set(_PENGELOLA),
    JALANKAN_JOB_ANALITIK: {KodePeran.admin} | set(_PENGELOLA),
    BACA_JOB_ANALITIK: {KodePeran.admin} | set(_PENGELOLA),
}

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

_PENGELOLA = {KodePeran.pokdarwis, KodePeran.perangkat_desa, KodePeran.admin}
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
    UNGGAH_MEDIA: {KodePeran.kontributor, KodePeran.umkm, KodePeran.agen} | _PENGELOLA,
    KELOLA_LAMPIRAN: {KodePeran.umkm, KodePeran.agen} | _PENGELOLA,
}

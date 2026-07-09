"""Enum F1 (ERD §4) — nilai persis seperti kontrak."""
from __future__ import annotations

from .errors import ValidasiGagal

UMKM_STATUS_VERIFIKASI = frozenset({"menunggu", "terverifikasi", "ditolak"})
PRODUK_JENIS = frozenset({"produk", "jasa"})
PRODUK_STATUS = frozenset({"draft", "publikasi", "arsip"})
PAKET_STATUS = frozenset({"draft", "review", "publikasi", "ditolak", "arsip"})
KONTRIBUSI_TIPE = frozenset({"foto", "tips", "koreksi_data", "spot_baru", "ulasan"})
KONTRIBUSI_TARGET_TIPE = frozenset({"destinasi", "layanan", "umkm", "paket_wisata", "desa"})
KONTRIBUSI_STATUS = frozenset({"menunggu", "disetujui", "ditolak", "revisi"})
KURASI_ENTITAS_TIPE = frozenset({"kontribusi", "paket_wisata", "produk_jasa", "umkm", "pengajuan_kartu"})
KURASI_KEPUTUSAN = frozenset({"setuju", "tolak", "minta_revisi", "ajukan"})
PENGAJUAN_SUBJEK_TIPE = frozenset({"umkm", "agen", "pokdarwis"})
PENGAJUAN_STATUS = frozenset({"menunggu", "tervalidasi", "ditolak", "revisi"})
SERTIFIKASI_TINGKAT = frozenset({"tunas", "bahari", "lumba_lumba"})
SATUAN_HARGA = frozenset({
    "per_item", "per_orang", "per_paket", "per_jam", "per_hari", "gratis",
})

PERAN_PENGELOLA = frozenset({"pokdarwis", "perangkat_desa", "admin"})


def wajib_enum(nilai: str, himpunan: frozenset[str], field: str) -> str:
    if nilai not in himpunan:
        raise ValidasiGagal(
            f"Nilai `{field}` tidak valid.",
            rincian=[{"field": field, "pesan": "nilai_tidak_valid"}],
        )
    return nilai

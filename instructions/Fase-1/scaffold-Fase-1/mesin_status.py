"""State machine terpusat (KONTRAK §6). Bentuk transisi seragam; guard beda per entitas.

Tabel: {entitas_tipe: {(status_awal, aksi): status_tujuan}}.
Guard peran diperiksa di service (butuh konteks kepemilikan), bukan di sini.
`arsip` pada paket adalah lifecycle owner — TIDAK menulis kurasi_log (ADR §9.5).
"""
from __future__ import annotations

from .errors import TransisiIlegal

TABEL = {
    "paket_wisata": {
        ("draft", "ajukan"): "review",
        ("review", "setuju"): "publikasi",
        ("review", "tolak"): "ditolak",
        ("review", "minta_revisi"): "draft",
        ("publikasi", "arsip"): "arsip",
    },
    "kontribusi": {
        ("menunggu", "setuju"): "disetujui",
        ("menunggu", "tolak"): "ditolak",
        ("menunggu", "minta_revisi"): "revisi",
        ("revisi", "ajukan"): "menunggu",  # kirim ulang oleh penyumbang
    },
    "pengajuan_kartu": {
        ("menunggu", "setuju"): "tervalidasi",  # UI: "validasi"
        ("menunggu", "tolak"): "ditolak",
        ("menunggu", "minta_revisi"): "revisi",
        ("revisi", "ajukan"): "menunggu",  # kirim ulang oleh owner
    },
}

# transisi yang bukan keputusan kurasi → tidak menulis kurasi_log
TANPA_LOG = {("paket_wisata", "arsip")}


def transisi(entitas_tipe: str, status_awal: str, aksi: str) -> str:
    tujuan = TABEL.get(entitas_tipe, {}).get((status_awal, aksi))
    if tujuan is None:
        raise TransisiIlegal(
            f"Transisi ilegal: {entitas_tipe} `{status_awal}` --({aksi})-->.",
            rincian=[{"field": "aksi", "pesan": "transisi_ilegal"}],
        )
    return tujuan


def tulis_log(entitas_tipe: str, aksi: str) -> bool:
    return (entitas_tipe, aksi) not in TANPA_LOG

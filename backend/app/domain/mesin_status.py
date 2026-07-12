"""State machine terpusat (KONTRAK F1 §6)."""
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
        ("revisi", "ajukan"): "menunggu",
    },
    "pengajuan_kartu": {
        ("menunggu", "setuju"): "tervalidasi",
        ("menunggu", "tolak"): "ditolak",
        ("menunggu", "minta_revisi"): "revisi",
        ("revisi", "ajukan"): "menunggu",
    },
    "berita": {
        ("draft", "publikasi"): "publikasi",
        ("draft", "arsip"): "arsip",
        ("publikasi", "draft"): "draft",
        ("publikasi", "arsip"): "arsip",
        ("arsip", "draft"): "draft",
        ("arsip", "publikasi"): "publikasi",
    },
}

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

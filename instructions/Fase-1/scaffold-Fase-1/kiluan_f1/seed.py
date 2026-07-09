"""Seed lookup F1 (samakan dengan migrasi Alembic 0002_f1)."""
from __future__ import annotations

from .models import AturanPoin, Badge, BidangUsaha, KartuAksi
from .repositori import RepoMemori

BIDANG_USAHA = [
    ("kuliner", "Kuliner", "🍲"),
    ("kerajinan", "Kerajinan", "🧺"),
    ("homestay", "Homestay", "🏠"),
    ("jasa_wisata", "Jasa Wisata", "⛵"),
    ("hasil_laut", "Hasil Laut", "🐟"),
]

ATURAN_POIN = [
    ("kontribusi_disetujui", 20, "Kontribusi disetujui kurator"),
    ("produk_terdaftar", 10, "Produk/jasa pertama terdaftar"),
    ("paket_dipublikasi", 30, "Paket wisata dipublikasi"),
    ("profil_lengkap", 15, "Profil UMKM lengkap"),
    ("warga_perintis", 50, "Warga perintis platform"),
]

BADGE = [
    ("penjelajah", "Penjelajah", "Kontribusi pertama", "🧭", 1, {"poin_min": 20}),
    ("kurator_warga", "Kurator Warga", "10 kontribusi disetujui", "⭐", 2,
     {"aksi": "kontribusi_disetujui", "jumlah": 10}),
    ("pelopor", "Pelopor", "50 poin di desa", "🏅", 3, {"poin_min": 50}),
]

KARTU_AKSI = [
    ("pilah_sampah", "Pilah Sampah", "Memilah sampah di usaha",
     "Sampah terpilah mengurangi beban ekosistem pesisir.",
     {"foto": True, "pernyataan": True}, 15),
    ("hemat_air", "Hemat Air", "Menghemat penggunaan air",
     "Air bersih langka; hemat air = lestari sumber daya.",
     {"pernyataan": True}, 10),
    ("edukasi_tamu", "Edukasi Tamu", "Mengedukasi tamu soal konservasi",
     "Tamu yang sadar lingkungan menjaga daya dukung destinasi.",
     {"foto": True, "dokumen": False, "pernyataan": True}, 20),
    ("energi_bersih", "Energi Bersih", "Beralih ke sumber energi ramah lingkungan",
     "Energi bersih menurunkan jejak karbon wisata.",
     {"foto": True, "pernyataan": True}, 25),
]


async def isi_bidang_usaha(repo: RepoMemori) -> None:
    for kode, nama, ikon in BIDANG_USAHA:
        await repo.simpan(BidangUsaha(kode=kode, nama=nama, ikon=ikon))


async def isi_aturan_poin(repo: RepoMemori) -> None:
    for kode, poin, desk in ATURAN_POIN:
        await repo.simpan(AturanPoin(kode_aksi=kode, poin=poin, deskripsi=desk, desa_id=None))


async def isi_badge(repo: RepoMemori) -> None:
    for kode, nama, desk, ikon, tingkat, syarat in BADGE:
        await repo.simpan(Badge(
            kode=kode, nama=nama, deskripsi=desk, ikon=ikon,
            tingkat=tingkat, syarat=syarat, desa_id=None,
        ))


async def isi_kartu_aksi(repo: RepoMemori) -> None:
    for kode, nama, desk, kenapa, bukti, bobot in KARTU_AKSI:
        await repo.simpan(KartuAksi(
            kode=kode, nama=nama, deskripsi=desk, kenapa_penting=kenapa,
            bukti_dibutuhkan=bukti, bobot=bobot, desa_id=None,
        ))


async def isi_semua(repo_bidang, repo_aturan, repo_badge, repo_kartu) -> None:
    await isi_bidang_usaha(repo_bidang)
    await isi_aturan_poin(repo_aturan)
    await isi_badge(repo_badge)
    await isi_kartu_aksi(repo_kartu)

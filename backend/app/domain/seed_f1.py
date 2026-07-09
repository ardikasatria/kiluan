"""Seed lookup F1 — nilai sama dengan migrasi 0003_f1 & kiluan_f1/seed.py."""
from __future__ import annotations

from app.domain import entitas as E


async def isi_lencana(store) -> None:
    """Isi bidang_usaha, aturan_poin, badge untuk uji in-memory."""
    for kode, nama, ikon in [
        ("kuliner", "Kuliner", "🍲"),
        ("kerajinan", "Kerajinan", "🧺"),
        ("homestay", "Homestay", "🏠"),
        ("jasa_wisata", "Jasa Wisata", "⛵"),
        ("hasil_laut", "Hasil Laut", "🐟"),
    ]:
        await store.bidang_usaha.tambah(E.BidangUsaha(kode=kode, nama=nama, ikon=ikon))

    for kode, poin, desk in [
        ("kontribusi_disetujui", 20, "Kontribusi disetujui kurator"),
        ("produk_terdaftar", 10, "Produk/jasa pertama terdaftar"),
        ("paket_dipublikasi", 30, "Paket wisata dipublikasi"),
        ("profil_lengkap", 15, "Profil UMKM lengkap"),
        ("warga_perintis", 50, "Warga perintis platform"),
    ]:
        await store.aturan_poin.tambah(
            E.AturanPoin(kode_aksi=kode, poin=poin, deskripsi=desk, desa_id=None)
        )

    for kode, nama, desk, ikon, tingkat, syarat in [
        ("penjelajah", "Penjelajah", "Kontribusi pertama", "🧭", 1, {"poin_min": 20}),
        ("kurator_warga", "Kurator Warga", "10 kontribusi disetujui", "⭐", 2,
         {"aksi": "kontribusi_disetujui", "jumlah": 10}),
        ("pelopor", "Pelopor", "50 poin di desa", "🏅", 3, {"poin_min": 50}),
    ]:
        await store.badge.tambah(E.Badge(
            kode=kode, nama=nama, deskripsi=desk, ikon=ikon,
            tingkat=tingkat, syarat=syarat, desa_id=None,
        ))


async def isi_kartu_aksi(store) -> None:
    for kode, nama, desk, kenapa, bukti, bobot in [
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
    ]:
        await store.kartu_aksi.tambah(E.KartuAksi(
            kode=kode, nama=nama, deskripsi=desk, kenapa_penting=kenapa,
            bukti_dibutuhkan=bukti, bobot=bobot, desa_id=None,
        ))


async def isi_semua_f1(store) -> None:
    await isi_lencana(store)
    await isi_kartu_aksi(store)

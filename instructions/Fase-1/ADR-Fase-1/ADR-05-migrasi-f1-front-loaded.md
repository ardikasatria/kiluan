# ADR-05 — Migrasi F1 front-loaded (satu increment `0002_f1`)

**Status:** Diterima (F1).
**Konteks pengambil keputusan:** Satria (technical lead) + co-architect.
**Terkait:** ADR-04, brief B5, `0001_bootstrap_f0.py`, ERD F1 (13 tabel + 2 ALTER F0).

## Konteks

F1 menambah 13 tabel + 2 ALTER F0 (`layanan.umkm_id`, perluasan CHECK `media_lampiran.entitas_tipe`) + seed lookup. Dua modul (Pasar Desa, Dapur Konten) menulis `transaksi_poin`, jadi substrat poin harus ada sejak awal. Percabangan: satu migrasi increment untuk seluruh fase, vs migrasi per-modul (B5..B8).

## Keputusan

**Satu migrasi increment `0002_f1` di B5** membuat seluruh 13 tabel F1 + 2 ALTER F0 + seed lookup (`bidang_usaha`, `aturan_poin`, `badge`, `kartu_aksi`) sekaligus. B6–B8 **tidak menyentuh skema** — hanya menambah repo SQL, endpoint, dan UI.

Alasan:
1. **ERD F1 dikunci sebagai satu unit** (ADR-04) → migrasi yang mencerminkannya juga satu unit.
2. **Upgrade/rollback atomik.** `upgrade head` / `downgrade` ke revisi F0 bersih dalam satu langkah; tak ada state setengah-jadi antar-modul.
3. **Menghindari dependensi tulis yang canggung.** Award poin dari Pasar Desa/Dapur Konten butuh `transaksi_poin`/`aturan_poin` sudah ada; front-load menghilangkan urutan migrasi berantai yang rapuh.
4. **Alembic tetap engine sinkron** (ADR-0003): migrasi pakai `DATABASE_URL_SYNC` (psycopg), terpisah runtime async.

## Konsekuensi

- B5 memikul migrasi terberat; B6–B8 murni aplikasi → Langkah 0 tiap brief menegaskan "jangan ubah skema".
- Enum ditegakkan **CHECK constraint** (bukan ENUM native): `umkm.status_verifikasi`, `produk_jasa.status`, `paket_wisata.status`, dll. GIST pada `umkm.lokasi`.
- UNIQUE kritis dibuat di migrasi ini: `paket_wisata(desa_id,slug)`, `transaksi_poin(pengguna_id,kode_aksi,referensi_tipe,referensi_id)`, `badge_pengguna(pengguna_id,badge_id)`, `sertifikasi_owner(desa_id,subjek_tipe,subjek_id)` — jadi prasyarat ADR-06 & ADR-08.
- Nilai seed disamakan dengan `kiluan_f1/seed.py` agar unit test (memori) & integrasi (DB) konsisten.

## Alternatif yang tidak diambil

**Migrasi per-modul (4 increment).** Lebih granular dan cocok bila modul dirilis terpisah lintas-waktu. Ditolak: F1 dikerjakan sebagai satu fase berurutan; empat migrasi berantai memperumit rollback parsial tanpa manfaat nyata di skala ini.

## Pemicu tinjau ulang

Bila F1 pecah jadi rilis terpisah berjauhan (mis. Naik Kelas ditunda jauh), pecah `0002_f1` jadi increment terpisah untuk modul yang tertunda.

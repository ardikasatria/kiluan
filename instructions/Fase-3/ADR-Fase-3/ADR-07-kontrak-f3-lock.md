# ADR-07 — Penguncian Kontrak API F3 (enam pilar mengikat)

**Status:** Diterima (F3). Mengunci `KONTRAK_API_Kiluan_Fase3.md`. Parameter tata kelola tetap terbuka sampai FGD (lihat "Pemicu tinjau ulang").
**Konteks pengambil keputusan:** Satria (technical lead) + co-architect.
**Terkait:** `ERD_Kiluan_Fase3.md`, `KONTRAK_API_Kiluan_Fase3.md`, scaffold `scaffold_f3/` (33 pytest hijau), brief B14–B16. Selaras pola F1 (ADR kontrak) & F2 (pilar mengikat).
**Catatan nomor:** samakan dgn indeks `docs/adr/`; bila 07 sudah terpakai F1, geser ke nomor bebas berikutnya (isi tak berubah).

## Konteks

F3 (Anjungan Data + Jejak Lestari) berbeda watak dari F0–F2: mayoritas permukaannya **bukan CRUD** melainkan **nilai turunan** (agregat, skor, kapasitas) yang dihasilkan job dari data mentah. Tanpa aturan mengikat di level kontrak, ada risiko nyata: skor regeneratif "disuntik" dari klien (greenwashing), agregat ditulis dua kali (dobel), data lapangan offline hilang/ganda, dan parameter tata kelola desa di-hardcode oleh engineer. PSD menuntut kontrak dikunci **sebelum** kode. ADR ini mengunci enam pilar yang mengikat implementasi B14–B16 dan fase turunannya.

## Keputusan

**Diterima: kontrak F3 dikunci dengan enam pilar mengikat.**

1. **Nilai turunan read-only (job-authoritative).** `agregat_harian`, `pemakaian_kapasitas`, `neraca_regeneratif` **tak pernah** ditulis lewat endpoint tulis publik — hanya job (medallion/hitung). API di atasnya hanya membaca + memicu job. Tak ada jalur menyuntik skor/agregat. (Sejajar "status uang bukan verba klien" F2.)
2. **Outbox internal + tepat-sekali.** `peristiwa` ditulis service domain dalam transaksi yang sama (transactional outbox); **tak ada `POST /peristiwa`**. Kursor `diproses_pada` menjamin ETL inkremental tepat-sekali; run ulang tak menggandakan.
3. **Dua gaya idempotensi.** Sinkron monitoring offline idempoten atas **`id` UUIDv7 buatan klien** (kunci alami); mutasi uang (outflow dana) idempoten atas **`Idempotency-Key`** header. Ditegakkan di DB (`ON CONFLICT DO NOTHING`), bukan read-then-write.
4. **Transparansi publik sengaja.** Saldo & rincian `dana_konservasi` (dgn foto bukti), ringkas `neraca_regeneratif`, dan `level` `pemakaian_kapasitas` terbuka **tanpa auth** sebagai pembeda non-OTA. Subset publik menyembunyikan PII pencatat, nominal per-penyedia, dan kunjungan mentah.
5. **Anti-greenwashing di lapisan hitung.** `skor_ekologi` hanya dari `monitoring_ekologi` **terverifikasi**. Klaim `stempel.dampak` divalidasi silang ke indikator terverifikasi; klaim tanpa dukungan → 0 kontribusi. Validasi ada di job, bukan endpoint; kontrak tak menyediakan cara "melewati" verifikasi.
6. **Ledger append-only + parameter regeneratif bukan hardcode.** `dana_konservasi` tak pernah di-update (koreksi = baris lawan; saldo = Σ). Bobot tiga pilar neraca, ambang daya dukung, dan peta klaim→indikator adalah **input Pokdarwis** — konfigurasi, bukan konstanta kode.

## Konsekuensi

- **Scaffold membuktikannya:** 33 `pytest` hijau mencakup 13 gerbang §10 (rekonsiliasi, tepat-sekali, sinkron idempoten, anti-greenwashing, isolasi tenant, dst).
- **B14–B16 mewujudkan verbatim:** endpoint tulis atas agregat/skor **dilarang**; menulisnya = pelanggaran kontrak (ditegaskan di Langkah 0 tiap brief).
- **Migrasi F3 front-loaded** `0004_f3` (semua tabel sekaligus di B14) → B15/B16 tak menyentuh skema.
- **Placeholder tata kelola** (`BobotNeraca`, ambang) jelas ditandai; **tak boleh** di-seed final sebelum FGD.
- **F4 (Nusantara) aman:** semua output ber-`desa_id` → RLS/ekspor per-desa = tambah kebijakan, bukan refactor kontrak.

## Alternatif yang tidak diambil

- **Izinkan override manual agregat/skor via API.** Ditolak — vektor greenwashing langsung; melanggar sumber-kebenaran-tunggal. Koreksi dilakukan lewat perbaikan sumber + hitung ulang job.
- **Ekspos DuckDB/kueri ad-hoc sebagai API tenant sekarang.** Ditolak untuk F3 — ranah alat ops; query API atas gold ditunda **F4** (kepemilikan/ekspor data).
- **Migrasi F3 per-modul.** Ditolak — empat migrasi berantai lebih rapuh saat rollback; ERD F3 dikunci sebagai satu unit → `upgrade`/`downgrade` atomik.
- **Transparansi agregat-saja (tanpa foto bukti/rincian).** Ditolak sebagai default — melemahkan pembeda regeneratif; tetap **tunable** bila tata kelola meminta.

## Pemicu tinjau ulang

Ditinjau bila: hasil **FGD Pokdarwis** mengubah parameter tata kelola (itu konfigurasi, **bukan** perubahan kontrak — tak perlu ADR baru); ATAU volume analitik menuntut medallion penuh §B (kontrak tetap, hanya isian `lapisan` bertambah); ATAU tata kelola meminta mengetatkan cakupan transparansi (ubah subset publik, bukan pilar).

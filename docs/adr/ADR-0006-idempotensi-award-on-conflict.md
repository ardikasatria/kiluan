# ADR-06 — Idempotensi award poin/badge via constraint DB (`ON CONFLICT`)

**Status:** Diterima (F1).
**Konteks pengambil keputusan:** Satria (technical lead) + co-architect.
**Terkait:** ADR-05, brief B5, ERD F1 §3.9–3.10, `kiluan_f1/layanan/lencana_warga.py`.

## Konteks

Award poin dipicu event domain (`kontribusi→disetujui`, `produk` dibuat, `paket→publikasi`). Event bisa datang ganda: retry klien, klik-ganda, atau menyetujui ulang entitas yang sama. Scaffold in-memory mencegah double-award dengan **cek baca-lalu-tulis** (`_sudah_award` → skip). Di DB nyata dengan konkurensi, baca-lalu-tulis punya jendela race: dua permintaan membaca "belum ada" lalu keduanya menulis.

## Keputusan

**Idempotensi ditegakkan constraint DB, bukan logika aplikasi.**

- `transaksi_poin`: `UNIQUE(pengguna_id, kode_aksi, referensi_tipe, referensi_id)`. `award(...)` memakai `INSERT … ON CONFLICT DO NOTHING`; bila 0 baris terpengaruh → kembalikan `False` (sudah pernah di-award).
- `badge_pengguna`: `UNIQUE(pengguna_id, badge_id)` + `INSERT … ON CONFLICT DO NOTHING`.
- `sertifikasi_owner`: `UNIQUE(desa_id, subjek_tipe, subjek_id)` + `INSERT … ON CONFLICT DO UPDATE` (upsert saat recompute).

Cek aplikasi (`_sudah_award`) boleh tetap ada sebagai *fast-path* hemat, tetapi **bukan** jaminan — jaminan ada di constraint.

## Konsekuensi

- Signature service tak berubah dari scaffold (`award(...) -> bool`); yang berubah hanya implementasi `repo/sql.py` (dari cek-Python ke `ON CONFLICT`). Unit test memori tetap hijau (perilaku identik).
- Constraint didefinisikan di migrasi `0002_f1` (ADR-05) → prasyarat brief B5.
- Award membutuhkan `referensi_tipe`/`referensi_id` **stabil** per event (mis. `(kontribusi, id)`), bukan timestamp — kalau referensi tidak stabil, idempotensi bocor.
- **Gerbang integrasi wajib menguji constraint, bukan hanya cek Python:** setuju dua kali → tepat satu baris `transaksi_poin` (§10).

## Alternatif yang tidak diambil

- **Baca-lalu-tulis di aplikasi saja** — cukup untuk single-worker/low-concurrency, tapi rawan race saat webhook/PWA-sync datang berbondong (relevan F2). Ditolak sebagai satu-satunya jaminan.
- **Lock pesimistik / advisory lock per award** — benar tapi lebih mahal & rumit daripada unique constraint untuk kasus insert-idempoten. Ditolak.

## Pemicu tinjau ulang

Bila muncul kebutuhan award yang tak punya referensi natural stabil (mis. bonus periodik), tambah kolom kunci idempotensi eksplisit (mis. `idempotency_key`) alih-alih melonggarkan constraint.

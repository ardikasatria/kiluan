# Brief Cursor — B/F-Simpanan: Wishlist (Wisata + Misi)

**Platform:** **Sigerciv** (pariwisata regeneratif desa-desa Lampung, di-tuning AI & sains data). *Rebrand brand-layer, tanpa perubahan skema selain tabel baru ini.*
**Cakupan:** fitur **Wishlist** — simpan destinasi/paket ("wisata yang ingin dikunjungi") **dan** misi regeneratif. Lintas-desa. **Modul baru** → menyentuh skema, jadi **berpasangan backend + frontend, design-first**.
**Prasyarat:** F0 hijau (destinasi publik). Paket = F1, Misi = F2 → wishlist di-*front-load* untuk ketiga tipe, tapi tipe yang modulnya belum ada ditolak halus sampai aktif.
**Rujukan:** `ERD_Kiluan_Fase0 §2 konvensi (UUIDv7, CHECK enum, keyset, polimorfik media_lampiran)`, `KONTRAK_API_Fase0 §1`.

> **Keputusan penamaan (butuh sign-off).** Saya rekomendasikan tabel `simpanan` (item yang disimpan pengguna). Risiko: "simpanan" bisa terbaca konteks uang. Alternatif: `wishlist` / `favorit`. **Domain naming = otoritasmu** — konfirmasi sebelum kunci ADR. Brief ini pakai `simpanan` sebagai placeholder.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `backend/`: pola repo async + in-memory (README), model `tabel.py`, alur migrasi Alembic increment (`0001_bootstrap_f0`, `0002_f1`…), amplop error & keyset. Baca `frontend/`: kartu spot/paket/misi + design tokens + klien API. Konfirmasi user dropdown & dashboard wisatawan (brief F-Akun/F-Dashboard) sebagai titik masuk. Ringkas file yang disentuh + risiko. **Jangan** ubah `domain/**`/`skema/**` lama; perubahan skema hanya via increment baru.

---

## Rancang (design-first — kunci sebelum kode)

### Tabel `simpanan` (Alembic increment baru, mis. `000X_simpanan`)
- `id` UUIDv7 PK · `pengguna_id` FK → pengguna · `desa_id` FK → desa (diisi dari desa item; untuk filter/scope) ·
- `tipe` varchar + `CHECK (tipe IN ('destinasi','paket','misi'))` (enum via CHECK, bukan ENUM native — konsisten ERD) ·
- `entitas_id` UUID (polimorfik ke destinasi/paket/misi; **tanpa FK** karena polimorfik, divalidasi di service — pola sama `media_lampiran`) ·
- `catatan` text NULL · `dibuat_pada` timestamptz.
- **`UNIQUE(pengguna_id, tipe, entitas_id)`** → tambah idempoten.
- Index `(pengguna_id, dibuat_pada, id)` untuk keyset.

### Kontrak API (global, user-scoped, lintas-desa)
- `GET /saya/simpanan?tipe=&batas=&kursor=` — daftar keyset; tiap item merakit ringkasan entitas (nama, media utama, desa) sesuai `tipe`.
- `POST /saya/simpanan {tipe, entitas_id, catatan?}` — tambah; **idempoten** (`ON CONFLICT DO NOTHING` → 200 bila sudah ada, 201 bila baru). Validasi: entitas ada, `publikasi`, di desa `aktif`; else `404`. Tipe yang modulnya belum aktif (paket/misi pra-fase) → `422 belum_tersedia`.
- `DELETE /saya/simpanan/{id}` — hapus milik sendiri; milik user lain → `404`.
- `PATCH /saya/simpanan/{id} {catatan}` — opsional.
- `GET /saya/simpanan/status?tipe=&entitas_id=...` — cek ringan "sudah disimpan?" (batch) untuk render ikon hati di daftar/detail tanpa N+1.

### Gerbang pytest (backend; scaffold in-memory dulu, lalu SQL)
Tambah idempoten (dobel → tetap satu, `UNIQUE`); `desa_id` terisi dari entitas; hapus lintas-user → 404; tipe tak dikenal → 422; entitas non-publikasi/lintas-tenant → 404; keyset stabil saat disisipkan; status-check benar (batch). Semua terfilter `pengguna_id`.

---

## Scaffold + pytest (WAJIB sebelum frontend konsumsi)

Wujudkan `layanan/simpanan.py` (aturan: idempotensi, validasi entitas polimorfik, kepemilikan) + repo in-memory, hijaukan gerbang di atas. Baru buat Alembic increment + repo SQL async. **Frontend tidak boleh** mengonsumsi endpoint sebelum gerbang hijau.

---

## Frontend

Langkah 0 dulu, lalu:
- **Tombol simpan** (ikon hati/bookmark) di kartu & halaman detail destinasi/paket/misi. Toggle optimistic + rollback saat gagal. Tamu → prompt **Masuk**. Pakai `GET .../status` untuk state awal.
- **Halaman Wishlist** `/saya/wishlist`: tab **Wisata** (destinasi + paket) & **Misi**; grid kartu (foto, nama, desa, badge tipe); catatan editable; hapus; buka detail; **empty state** ramah (ajakan jelajah).
- **Titik masuk:** item "Wishlist saya" di dropdown pengguna + kartu di dashboard wisatawan.
- **Offline-first (PWA):** aksi simpan/hapus saat offline masuk antrean, sinkron tertunda (IndexedDB) — konsisten pola entri lapangan.
- **Lintas-desa:** wishlist menampung item dari desa mana pun di Lampung; tampilkan label desa tiap item.

### Gerbang (uji frontend)
Toggle simpan optimistic + rollback; tamu diarahkan login; tab Wisata/Misi benar; empty state tampil; offline queue tersinkron; A11y AA pada tombol & halaman.

---

## Batas

Rekomendasi berbasis wishlist (Pemandu AI) → F2+. Berbagi/publik wishlist → di luar cakupan. Notifikasi "harga/slot berubah" pada item tersimpan → butuh Dermaga (F2) + notifikasi (celah backend).

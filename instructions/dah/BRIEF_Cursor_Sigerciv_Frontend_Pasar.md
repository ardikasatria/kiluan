# Brief Cursor — F-Pasar: Pasar Desa (Direktori + Detail UMKM/Produk + Dashboard UMKM)

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung, di-tuning AI & sains data. *(Fase F1.)*
**Cakupan:** permukaan publik **Pasar Desa** (direktori UMKM + produk/jasa, halaman detail) dan **dashboard UMKM** (kelola profil + editor produk). Tenant-scoped, generik.
**Mode:** **Next.js web murni (belum PWA)** — SSR/ISR untuk direktori/detail (SEO); tanpa offline.
**Prasyarat:** F1 backend hijau (B5/B6). Endpoint: `GET /bidang-usaha`, `GET/POST/PATCH/DELETE /desa/{slug}/umkm[...]`, `.../umkm/{id}/verifikasi`, `GET/POST/PATCH/DELETE /desa/{slug}/produk[...]`, `.../produk/{id}/status`, `GET /desa/{slug}/sertifikasi`, lampiran (`entitas_tipe="produk_jasa"|"umkm"`).
**Rujukan:** `KONTRAK_API_Fase1 §3 (Pasar Desa) & §7 (sertifikasi) & §8 (DTO)`, brief B6/F6.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `frontend/`: shell dashboard + konteks desa/peran aktif, komponen **galeri media presigned** (B4) & **map picker** (F-Kelola) & `<BadgeChip>`/`<PoinRingkas>` (F5) — reuse. Cek klien API + tipe DTO `Umkm/ProdukJasa/BidangUsaha/SertifikasiOwner`, keyset, amplop error. Typecheck/lint hijau. Ringkas file disentuh + risiko. **Jangan** duplikasi logika galeri/kepemilikan.

---

## Aturan domain yang mengikat UI (jujur)

- **Publik hanya melihat:** UMKM `terverifikasi` + produk `publikasi` dari UMKM terverifikasi.
- **Publish-gate:** produk boleh dibuat `draft`, tapi **`→publikasi` ditolak `422` bila UMKM belum `terverifikasi`**. UI: tombol Publikasi **disabled + tooltip** menjelaskan alasan; tetap tangani 422 dari backend (jangan andalkan UI saja).
- **Kepemilikan:** UMKM/produk hanya bisa diubah pemiliknya; **Pengelola Desa** (`pokdarwis`/`perangkat_desa`/`admin`) semua. Edit lintas-pemilik → `403`, tangani dengan pesan jelas.
- **Verifikasi UMKM:** aksi Pengelola Desa (`PATCH .../umkm/{id}/verifikasi {keputusan}`). Ini bagian dashboard pengelola, bukan UMKM.

---

## Permukaan publik (SSR/ISR)

**Direktori** `/[desa]/pasar`: daftar UMKM + produk publik. Filter `bidang` (`GET /bidang-usaha`), pencarian `q`, `dekat` (geolocation → `jarak_m`, fallback tanpa jarak). Kartu UMKM menampilkan **lencana tingkat sertifikasi** (🌱 Tunas / 🐚 Bahari / 🐬 Lumba-Lumba) dari `sertifikasi{tingkat}` yang sudah embed di DTO — tanpa round-trip. Keyset "muat lebih banyak".

> **Urutan default = otoritas backend** (fungsi tingkat + rating + **kebaruan/rotasi eksposur**, anti rich-get-richer). Frontend **menghormati urutan itu**; boleh sediakan toggle "terbaru"/"terdekat" sebagai opsi eksplisit, tapi **jangan** jadikan sort-by-tingkat sebagai default yang mematikan rotasi.

**Detail UMKM** `/[desa]/pasar/umkm/{id}`: profil (deskripsi, kontak/WhatsApp, alamat, peta bila `lokasi` ada), galeri, **tingkat + skor sertifikasi**, daftar produk publik.
**Detail produk** `/[desa]/pasar/produk/{id}`: galeri, harga/satuan, stok (bila `jenis=produk`), UMKM pemilik, tombol **Simpan** (wishlist, brief F-Wishlist).

---

## Dashboard UMKM (peran `umkm`; Pengelola Desa: semua)

Tenant-scoped di `/[desa]/kelola/umkm` & `/[desa]/kelola/produk`.

**Profil UMKM:** daftarkan (`POST` → `status_verifikasi=menunggu`; syarat: keanggotaan `umkm` aktif di desa), edit (`PATCH`), galeri (`entitas_tipe="umkm"`), peta lokasi (opsional, map picker). Tampilkan **status verifikasi** (menunggu/terverifikasi/ditolak) menonjol + apa artinya untuk publikasi produk.

**Editor produk:** list milik UMKM → form (`nama`, `jenis` produk|jasa, `deskripsi`, `harga`, `satuan_harga`, `stok` [null untuk jasa], `status`), galeri (`entitas_tipe="produk_jasa"`). Toggle status `draft↔publikasi↔arsip` — **Publikasi disabled + tooltip** bila UMKM belum terverifikasi. Soft delete.

**Catatan:** progresi **Naik Kelas Lestari** (kartu aksi + pengajuan) = brief terpisah; di sini hanya **tampilkan tingkat** yang sudah dicapai.

---

## Sistem desain

Reuse token & komponen Sigerciv. `<TingkatSertifikasi>` chip reusable (dipakai direktori, detail, dashboard). Kartu UMKM/produk konsisten dengan Discovery/Landing. Form validasi inline + optimistic + rollback. A11y AA; empty/loading/error ramah. Brand **Sigerciv**, label generik "Pengelola Desa".

---

## Gerbang (uji frontend — web, tanpa offline)

- **Publik terfilter:** hanya UMKM terverifikasi + produk publikasi tampil (mock); draft/menunggu tak bocor.
- **Publish-gate:** UMKM belum terverifikasi → tombol Publikasi disabled + tooltip; paksa publikasi → 422 ditangani.
- **Kepemilikan:** umkm hanya kelola miliknya; lintas-pemilik → 403 ditangani; pengelola semua.
- **Sertifikasi:** lencana tingkat tampil dari DTO tanpa round-trip terpisah.
- **Urutan:** direktori memakai urutan backend sebagai default (tidak di-resort ke tingkat murni).
- **Galeri:** `entitas_tipe` benar (umkm/produk_jasa); sampul `utama` tunggal (reuse B4).
- **SEO/SSR:** direktori & detail server-rendered; meta/OG terisi. A11y axe bersih.

---

## Batas

Transaksi/checkout produk → **Dermaga (F2)**. Progresi Naik Kelas Lestari (pengajuan kartu) → brief terpisah F1. Offline entri lapangan → fase **PWA**. Rekomendasi terpersonalisasi → Pemandu (F2+).

# Brief Cursor — F-Paket: Editor Paket Agen + Itinerary + State Machine

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung. *(Fase F1.)*
**Cakupan:** dashboard **Agen Lokal** untuk paket wisata — editor metadata, **penyusun itinerary**, **transisi state machine** (draft→review→publikasi), plus halaman **detail paket publik**. Tenant-scoped.
**Mode:** **Next.js web murni (belum PWA)** — SSR/ISR untuk detail publik; tanpa offline.
**Prasyarat:** F1 backend hijau (B6). Endpoint: `GET/POST/PATCH/DELETE /desa/{slug}/paket[...]`, `.../paket/{id}/transisi`, itinerary `.../paket/{id}/item` (POST/PATCH/DELETE), lampiran (`entitas_tipe="paket_wisata"`).
**Rujukan:** `KONTRAK_API_Fase1 §3.4 (paket) & §6.1 (state machine) & §8 (DTO)`, brief B6/F6.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `frontend/`: shell dashboard + konteks desa/peran, galeri media presigned (B4), komponen kartu & badge status. Cek klien API + tipe DTO `PaketWisata/PaketItem`, keyset, amplop error, serta referensi entitas (`destinasi/layanan/produk_jasa`) untuk picker itinerary. Typecheck/lint hijau. Ringkas file disentuh + risiko.

---

## State machine paket (§6.1) — yang menentukan tombol UI

```
draft ──(ajukan: agen)──► review ──(setuju: pengelola)──► publikasi
  ▲                          │
  └──(minta_revisi)──────────┤
                             └──(tolak: pengelola)──► ditolak
publikasi ──(arsip: agen/pengelola)──► arsip
```
- Semua transisi via **`POST .../paket/{id}/transisi { aksi, catatan? }`**.
- **Aksi Agen:** `ajukan` (dari `draft`/`ditolak`/setelah revisi), `arsip` (dari `publikasi`).
- **Aksi Pengelola (kurator):** `setuju` / `tolak` / `minta_revisi` (saat `review`) — **bukan** di brief ini; itu antrean kurasi (brief Dapur Konten berikutnya). Di sini agen hanya **melihat** hasil + `catatan` kurator.
- **`arsip`** = lifecycle owner, **tidak** menulis kurasi_log (ADR §9.5) — cukup ubah status.
- Tombol dirender sesuai status + peran; transisi ilegal tak ditawarkan (dan backend menolak `422`).

---

## Editor Paket (peran `agen`; Pengelola Desa: semua)

Tenant-scoped `/[desa]/kelola/paket` (list + form).

**List:** paket milik agen (filter status), **badge status** jelas (draft/review/publikasi/ditolak/arsip). Pengelola melihat semua.

**Form metadata** (`POST`/`PATCH`): `slug` (unik per desa → `409` ditangani), `nama`, `deskripsi`, `durasi_jam`, `harga`, `satuan_harga`, `kuota_default`. Galeri via lampiran `entitas_tipe="paket_wisata"`.

**Penyusun itinerary** (sub-resource `.../item`):
- Item punya `hari`, `urutan` (drag untuk atur; simpan urutan), `judul`, `deskripsi`, `durasi_menit`, dan **referensi opsional** ke `destinasi_id` / `layanan_id` / `produk_jasa_id` (picker).
- **Validasi (samakan backend):** item **wajib** punya minimal satu referensi **atau** `judul` terisi → item kosong ditolak `422` (pra-validasi di klien + tangani 422). Referensi harus **se-tenant & hidup** → lintas-desa/mati `404` ditangani.
- Tampilkan itinerary terkelompok per `hari`, terurut `urutan`.

**Aksi transisi:** tombol **Ajukan** (draft/ditolak → review), **Arsipkan** (publikasi → arsip). Saat `review` → tampil "menunggu tinjauan pengelola" (read-only). Saat `ditolak`/pasca-`minta_revisi` → tampilkan **catatan kurator**, izinkan edit lalu **Ajukan** ulang. Guard kepemilikan (agen hanya paketnya → 403 ditangani).

---

## Detail paket publik (SSR/ISR)

`/[desa]/paket/{slug}`: hanya `publikasi`. Tampilkan metadata, galeri, **itinerary terurut `(hari, urutan)`**, agen pembuat, tombol **Simpan** (wishlist). Meta/OG terisi.

> **Batas penting:** `kuota_default` & `harga` di sini **bukan** slot terjual. Penjadwalan per-tanggal, kuota harian, dan booking = **Dermaga (F2)**. Jangan bikin tombol "pesan/bayar" di F1 — cukup "Simpan" / "hubungi".

---

## Sistem desain

Reuse token & komponen Sigerciv; galeri presigned (B4). `<BadgeStatus>` reusable untuk state machine (dipakai lagi di antrean kurasi). Itinerary builder: drag-drop aksesibel dengan **fallback keyboard** (tombol naik/turun urutan, bukan hanya drag). Form validasi inline + optimistic + rollback. A11y AA; empty/loading/error ramah. Brand **Sigerciv**.

---

## Gerbang (uji frontend — web, tanpa offline)

- **State machine:** tombol sesuai status+peran; agen bisa draft→**ajukan**→review; transisi ilegal tak ditawarkan & 422 ditangani.
- **Itinerary:** item tanpa referensi & tanpa judul ditolak (klien + 422); referensi lintas-tenant → 404 ditangani; urutan tersimpan & tampil terkelompok per hari.
- **Slug unik:** `(desa_id, slug)` bentrok → 409 ditangani.
- **Kepemilikan:** agen hanya paketnya → 403 ditangani; pengelola semua.
- **Catatan kurator:** tampil saat ditolak/revisi; edit → ajukan ulang jalan.
- **Arsip:** publikasi → arsip berhasil.
- **Publik:** detail hanya `publikasi`, itinerary terurut; **tanpa** tombol pesan/bayar. A11y axe bersih; drag punya fallback keyboard.

---

## Batas

Kurasi paket (setuju/tolak/minta_revisi) = **brief Dapur Konten** (pengelola). Booking/jadwal/pembayaran = **Dermaga (F2)**. Offline entri → fase **PWA**.

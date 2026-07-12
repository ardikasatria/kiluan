# Brief Cursor — F-Kupon: Kupon & Tukar Poin (Hadiah · Tukar · Dompet · Promo)

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung. *(Fase F2.)*
**Cakupan:** wisatawan — **katalog hadiah**, **tukar poin → kupon/hadiah**, **dompet kupon** + riwayat penukaran; owner/pengelola — **kelola katalog hadiah** & **buat kupon promo**. Menutup flywheel Misi Kiluan (diskon dari UMKM bersertifikat).
**Mode:** **Next.js web murni (belum PWA)** — tanpa offline. i18n via katalog; label `syarat`/`tingkat` via kode; Rupiah/poin per locale.
**Prasyarat:** F2 backend hijau. Endpoint: `GET /desa/{slug}/hadiah[/{id}]`, `POST .../hadiah`, `PATCH .../hadiah/{id}`, `POST /desa/{slug}/tukar`, `GET .../penukaran/saya`, `GET .../kupon/saya`, `GET .../kupon/{kode}/cek`, `POST .../kupon`; **saldo poin** dari endpoint poin F1 (Lencana Warga — konfirmasi path di repo).
**Rujukan:** `KONTRAK_API_Fase2 §1 (idempotensi) & §5 (Kupon & Tukar Poin) & §8 (DTO)`, `ERD_Fase2 (kupon/penukaran)`, ADR self-funded discount, brief F-DermagaBeli/F-Penjelajah.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `frontend/`: **klien API terpusat** (header `Idempotency-Key`), shell + konteks desa, `<TingkatSertifikasi>`/`<PoinRingkas>` (F1/F-Pasar), galeri/upload presigned, format poin/uang + i18n, tipe DTO `KatalogHadiah/PenukaranPoin/Kupon`. Konfirmasi endpoint **saldo poin** F1. Typecheck/lint hijau. Ringkas file disentuh + risiko. **Jangan** sebar fetch mutasi poin di komponen.

---

## Aturan keselamatan poin (WAJIB)

- **Tukar = mutasi saldo poin** → `POST /tukar` **wajib `Idempotency-Key`** (UUID sekali per aksi, dipertahankan saat retry). Retry key sama → response tersimpan, tak menggandakan.
- **Saldo tak pernah optimistic.** Setelah tukar, **ambil ulang saldo dari server** — jangan hitung sendiri di klien (server yang lock & cegah double-spend).
- **Error ditangani jelas:** `422 saldo_poin_kurang`, `422` syarat tak terpenuhi (mis. `tingkat_min`), `409 stok_habis`.

---

## Sisi Wisatawan

**Saldo poin (header):** tampilkan saldo `(pengguna, desa)` dari endpoint poin F1. Poin diperoleh dari kontribusi (F1) & misi (F2) — tautkan ke Lencana/Paspor.

**Katalog hadiah** `/[desa]/hadiah`: `GET /hadiah` (global+lokal, aktif). Kartu: nama, `jenis` (`kupon_diskon|merchandise|tiket|donasi`), `biaya_poin`, `stok` (null = tak terbatas), `syarat` (mis. butuh tingkat owner — relevan bila penukar adalah owner), media. **Affordability + syarat:** bila saldo < `biaya_poin` atau syarat tak terpenuhi → tombol Tukar **disabled + alasan**; tetap tangani 422/409 dari server (UI bukan otoritas).

**Tukar** `POST /desa/{slug}/tukar` **[Idempotency-Key]** `{hadiah_id}` → `{penukaran, kupon|null}`. Konfirmasi biaya poin sebelum kirim. Sukses → tampilkan hasil: bila `kupon_diskon`, kupon masuk **dompet**; refresh saldo dari server.

**Dompet kupon** `/[desa]/dompet`: `GET /kupon/saya` (milik diri + publik berlaku). Kartu kupon: `kode` (bisa **disalin**), `tipe_diskon` (persen/nominal) + `nilai`, `min_belanja`, **`penyedia_terbatas`** ditampilkan jelas ("hanya di UMKM bersertifikat 🐬 Lumba-Lumba" / daftar penyedia), `berlaku_sampai`, `status`. Tautkan "pakai saat checkout" (penerapan final di F-DermagaBeli via `kupon/{kode}/cek` lalu checkout). Riwayat penukaran: `GET /penukaran/saya`.

> **Flywheel (jujur & positif):** `penyedia_terbatas` mengarahkan diskon ke **penyedia regeneratif bersertifikat** — inilah kanal "reward → permintaan ke owner yang naik kelas". Tampilkan sebagai fitur, bukan pembatasan yang membingungkan.

## Sisi Owner / Pengelola

**Kelola katalog hadiah** `/[desa]/kelola/hadiah` (pokdarwis/perangkat/admin): `POST/PATCH /hadiah` — nama, jenis, `biaya_poin`, `stok`, `syarat` (builder mis. `tingkat_min`), media, aktif/nonaktif.

**Buat kupon promo** `/[desa]/kelola/kupon`: `POST /kupon` — **owner → `promo_owner`** (untuk promonya), **pengelola → `kampanye`**. Field: `tipe_diskon`, `nilai`, `min_belanja`, `batas_pakai`, `penyedia_terbatas` (builder tingkat/umkm), `berlaku_mulai/sampai`. **Transparansi biaya (ADR self-funded):** diskon **mengurangi `bruto` penyedia secara proporsional**; kupon `promo_owner` **ditanggung owner sebagai biaya pemasaran**. UI harus menyatakan ini jelas saat owner membuat promo — jangan sembunyikan siapa yang menanggung.

---

## Sistem desain

Reuse token & komponen Sigerciv; `<TingkatSertifikasi>`, kartu kupon, kartu hadiah, saldo poin. Poin/Rupiah `Intl.NumberFormat` per locale. i18n via katalog (label/jenis/syarat); nama/deskripsi hadiah apa adanya (opsi A). Saldo poin **selalu dari server** (tak optimistic). A11y AA; empty/loading/error ramah; konfirmasi sebelum tukar. Brand **Sigerciv**.

---

## Gerbang (uji frontend — web, tanpa offline)

- **Idempotensi tukar:** retry pakai key sama (tak menggandakan); tanpa key → 422; **saldo di-refresh dari server** pasca-tukar.
- **Guard klien + server:** saldo kurang/syarat/stok → tombol disabled + alasan **dan** 422/409 server ditangani.
- **Dompet:** `kupon/saya` tampil; `penyedia_terbatas` jelas; `kode` bisa disalin; tautan ke checkout.
- **Owner promo:** `promo_owner` menampilkan penanda "ditanggung owner sebagai biaya pemasaran"; `kampanye` hanya pengelola; builder `penyedia_terbatas` jalan.
- **Katalog kelola:** buat/nonaktif hadiah; syarat builder benar; role gating.
- **i18n** label/jenis/syarat ID/EN; **a11y** axe bersih.

---

## Batas

Penerapan kupon **saat checkout** (`pemakaian_kupon`, `UNIQUE(kupon,pesanan)`, pratinjau `kupon/{kode}/cek`) = **F-DermagaBeli**. Perolehan poin (kontribusi/misi) = **F1 Lencana Warga / F2 Penjelajah**. Aliran nilai ke Neraca/dana konservasi → **F3**. Offline → fase **PWA**.

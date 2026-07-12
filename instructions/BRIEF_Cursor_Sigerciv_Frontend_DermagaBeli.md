# Brief Cursor — F-DermagaBeli: Dermaga Sisi Pembeli (Checkout → Bayar → Booking)

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung. *(Fase F2 · thin-slice PkM = jalur pembayaran manual.)*
**Cakupan:** perjalanan wisatawan — pilih **slot** → **checkout** (multi-penyedia + kupon) → **bayar** (QRIS statis manual, gateway progresif) → lacak **pesanan/booking** (QR check-in) → **ajukan refund**.
**Mode:** **Next.js web murni (belum PWA)** — tanpa offline. i18n via katalog; Rupiah/tanggal via format locale.
**Prasyarat:** F2 backend hijau (B9/B10 jalur manual). Endpoint: `GET /desa/{slug}/slot`, `POST /desa/{slug}/checkout`, `GET .../pesanan[/{id}]`, `.../pesanan/{id}/batal`, `.../pesanan/{id}/pembayaran`, `.../pembayaran/{id}/bukti`, `GET .../booking[/{id}]`, `GET .../kupon/{kode}/cek`, `POST .../refund`.
**Rujukan:** `KONTRAK_API_Fase2 §1 (idempotensi & transisi uang) & §4 (pembayaran) & §5 (state machine) & §6 (checkout) & §8 (DTO)`.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `frontend/`: **klien API terpusat** (tempat menyisipkan header `Idempotency-Key`), shell + konteks desa, galeri/upload presigned (B4), util format uang/tanggal + i18n, tipe DTO `Pesanan/PesananItem/SlotJadwal/Booking/Pembayaran/Kupon`. Typecheck/lint hijau. Ringkas file disentuh + risiko. **Jangan** sebar `fetch` uang di komponen — semua lewat klien terpusat.

---

## Aturan keselamatan uang (WAJIB, tidak boleh dilanggar)

1. **Klien tak pernah menandai lunas.** Kembali dari `redirect_url` gateway **tidak** mengubah status — hanya webhook (gateway) / `konfirmasi-manual` (bendahara) yang berwenang. Setelah bayar, **poll/refresh** status pesanan, jangan asumsikan sukses.
2. **`Idempotency-Key` wajib** pada `checkout`, `pembayaran`, `refund`. Klien **membuat UUID sekali per aksi**, simpan (mis. state + storage sementara) sampai sukses, kirim ulang **key sama** saat retry. Tanpa header → `422 idempotency_key_wajib`.
3. **Pembeli tak boleh konfirmasi bayarannya sendiri** (itu hak bendahara) → jangan tampilkan aksi itu.
4. **Field sensitif tak pernah tampil** (`pembayaran.mentah`, konfig gateway, nomor rekening penuh). Tampilkan apa adanya dari DTO ringkas.

---

## 1. Pilih slot & keranjang

Untuk item berjadwal (paket/layanan/destinasi berslot): `GET /slot?subjek_tipe=&subjek_id=&dari=&sampai=` → tampilkan tanggal + slot + `sisa` kuota + harga. Pilih tanggal/slot + `jumlah_orang`. Keranjang boleh **multi-penyedia** (oleh-oleh UMKM A + paket Agen B dalam satu pesanan). Barang fisik cek `stok`. Slot penuh/sisa kurang → nonaktifkan pilihan; race saat checkout ditangani di langkah 2.

## 2. Checkout

`POST /desa/{slug}/checkout` **[Idempotency-Key]** → buat `pesanan` + **hold kuota**. Tampilkan rincian: subtotal, **diskon** (kupon), total. **Kupon:** `GET .../kupon/{kode}/cek?total=&penyedia=` untuk **pratinjau** (`{berlaku, diskon, alasan?}`) — tegaskan "validasi final saat checkout" (pratinjau bisa beda dari final). Slot keburu penuh → tangani `409/422` (mis. `slot_penuh`/`stok_habis`) dengan pesan jelas + refresh ketersediaan. Sukses → pesanan `menunggu_pembayaran` dengan `kedaluwarsa_pada`.

## 3. Bayar

`POST /desa/{slug}/pesanan/{id}/pembayaran` **[Idempotency-Key]** `{metode}`. **Tampilkan hitung mundur** ke `kedaluwarsa_pada`; lewat → pesanan `kedaluwarsa` (kuota dilepas) — refleksikan di UI.

- **Manual (utama PkM, `gateway="manual"`):** respons berisi `instruksi_qris_statis {url, catatan}` (mis. "Sertakan kode KLN-7Q3M"). Tampilkan **QRIS statis + instruksi + kode unik**. Setelah transfer: `POST .../pembayaran/{id}/bukti` unggah `bukti_media_id` (foto transfer, presigned) → status **"menunggu verifikasi bendahara"**. Jangan klaim lunas.
- **Gateway (progresif, non-PkM):** respons berisi `redirect_url` → arahkan; **saat kembali, poll status** (jangan tandai lunas). Bangun sebagai jalur sekunder; sembunyikan/nonaktif saat `gateway="manual"`.

Retry bayar → baris `pembayaran` baru; maksimal satu `berhasil`. Daftar upaya: `GET .../pesanan/{id}/pembayaran`.

## 4. Pesanan & Booking

Detail pesanan `GET .../pesanan/{id|kode}`: **timeline status** (`menunggu_pembayaran → dibayar → diproses → selesai`), item + penyedia + `status_fulfillment`, pembayaran terakhir. **Batal** (`POST .../batal`) hanya saat `menunggu_pembayaran` → lepas kuota. Setelah `dibayar`, booking `terkonfirmasi` → tampilkan **`kode_checkin` sebagai QR** untuk ditunjukkan saat check-in. Riwayat: `GET .../pesanan?milik=saya`, `GET .../booking`.

## 5. Refund

`POST /desa/{slug}/refund` **[Idempotency-Key]** `{pesanan_id, pesanan_item_id?, alasan, jumlah?}` → status `diajukan`; lacak status (keputusan `setuju/tolak/proses/selesai` = sisi pengelola, di brief Kelola). Jangan janjikan hasil; tampilkan kebijakan pembatalan desa (`pengaturan_desa.kebijakan_pembatalan` publik).

---

## Sistem desain

Reuse token & komponen Sigerciv. Komponen: pemilih slot (kalender ketersediaan), ringkasan keranjang/checkout, kartu instruksi QRIS + uploader bukti, timeline status pesanan, kartu booking dengan **QR `kode_checkin`**, hitung mundur. Uang selalu `Intl.NumberFormat` IDR per locale. A11y AA; empty/loading/error ramah; **status uang selalu dari server** (tak ada optimistic pada uang). Brand **Sigerciv**.

---

## Gerbang (uji frontend — web, tanpa offline)

- **Idempotensi:** retry checkout/pembayaran/refund memakai **key sama** (tak menggandakan); tanpa key → 422 ditangani.
- **Redirect ≠ lunas:** kembali dari `redirect_url` **tidak** menandai `dibayar`; UI poll status.
- **Manual:** QRIS statis + kode unik tampil; unggah bukti → "menunggu verifikasi"; pembeli **tak** punya aksi konfirmasi.
- **Hold/kedaluwarsa:** hitung mundur; lewat → pesanan kedaluwarsa, kuota terlihat dilepas.
- **Race slot:** dua checkout slot sisa-1 → satu gagal ditangani (409/422), bukan crash.
- **Kupon:** pratinjau diskon tampil; ditegaskan final saat checkout.
- **Booking QR:** `kode_checkin` tampil sebagai QR setelah terkonfirmasi.
- **Sensitif tersembunyi;** Rupiah/tanggal terformat locale; i18n label; a11y axe bersih.

---

## Batas

Jalur gateway otomatis (redirect+webhook), disbursement, refund otomatis → **aktif bertahap** (non-PkM), lewat `pengaturan_desa.gateway` tanpa ubah UI. Penukaran poin→kupon (asal kupon dari Misi/Tukar Poin) = **modul Kupon & Tukar Poin** (brief terpisah). Sisi bendahara/penyedia (konfirmasi, escrow, payout, refund-keputusan, slot editor, check-in) → **brief F-DermagaKelola**. Offline checkout → fase **PWA**.

# Kontrak API Fase 2 — Kiluan

**Cakupan:** **Dermaga** (checkout multi-penyedia, `slot_jadwal` + `booking`, pembayaran escrow via gateway Indonesia + jalur manual, ledger `transaksi`, `payout`, `refund`, `rekening_penyedia`, `pengaturan_desa`) · **Kupon & Tukar Poin** · **Penjelajah Lestari** (Misi Kiluan sisi wisatawan: `misi`, `paspor_lestari`, `stempel`, `stasiun_lestari`) + `verifikasi` generik · **Pemandu** (AI tourism assistant, rule-based).
**Diturunkan dari:** `ERD_Kiluan_Fase2.md` (Dermaga 22 tabel + kupon/poin + Penjelajah + Pemandu). Nama field snake_case Bahasa Indonesia persis seperti ERD.
**Mewarisi:** seluruh konvensi `KONTRAK_API_Kiluan_Fase0.md` §1 (base path, auth, tenant path, keyset pagination, amplop error, soft delete, rate-limit) dan `KONTRAK_API_Kiluan_Fase1.md` §1 (transisi seragam `/transisi {aksi}`, kepemilikan, polimorfik tanpa FK keras). Dokumen ini hanya menambah yang **baru**.
**Status:** kandidat **ADR-05**. Kunci sebelum scaffold + `pytest` F2. Bergantung pada keputusan **ADR-02 (escrow via gateway Indonesia)**.

> **Aktifkan bertahap.** Skema dirancang penuh, dinyalakan bertahap (pola "tenant sejak F0"). **Tahap 1 PkM** = jalur pembayaran **manual** (QRIS statis + upload bukti + verifikasi bendahara) dan payout **manual** (transfer bendahara Pokdarwis). Jalur gateway (redirect + webhook + disbursement/refund otomatis) sudah punya slot kontrak, dinyalakan lewat `pengaturan_desa.gateway` tanpa mengubah bentuk endpoint.

---

## 1. Tambahan konvensi (di atas F0 §1 & F1 §1)

**Idempotensi uang & poin — header wajib.** Setiap POST yang memutasi uang atau saldo poin **wajib** membawa header `Idempotency-Key: <uuid>`. Server menyimpan `(idempotency_key, pengguna_id, endpoint) → response` di Redis (TTL 24 jam). Pengiriman ulang dengan kunci sama mengembalikan **response tersimpan** (status & body identik), tidak menjalankan efek kedua kali. Endpoint yang mewajibkannya: `POST /checkout`, `POST …/pembayaran`, `POST …/pembayaran/{id}/konfirmasi-manual`, `POST /tukar`, `POST /payout`, `POST /refund`. Tanpa header → `422` dengan `kode` internal `idempotency_key_wajib`.

> Alasan memakai header, bukan kunci turunan (mis. `kode_pesanan`): retry checkout terjadi **sebelum** `pesanan` ada, jadi tak ada kunci alami dari domain. Klien menghasilkan UUID sekali per aksi dan menyimpannya sampai sukses. Tradeoff §11.1.

**Transisi uang bukan verba klien.** Berbeda dari F1 (kurasi lewat `/transisi {aksi}`), status **uang/pembayaran/escrow** tidak pernah dipindah oleh klien. Sumber kebenaran = **webhook gateway terverifikasi** atau **aksi manusia berperan tertentu** (`konfirmasi-manual` oleh bendahara, `payout`, `refund/transisi`, `booking/checkin`). Klien yang kembali dari redirect gateway **tidak** boleh menandai `dibayar`. `/transisi {aksi}` F1 dipakai ulang **hanya** untuk alur manusia `refund` (`setuju|tolak|proses|selesai`) dan `payout` (`tandai_berhasil|tandai_gagal`). Transisi ilegal → `422 validasi_gagal`, `kode` internal `transisi_ilegal`.

**Webhook di luar path tenant.** Gateway tak tahu `slug`, jadi callback masuk endpoint **global** `POST /webhooks/pembayaran/{gateway}` (tanpa `/desa/{slug}`). Handler memverifikasi **signature** gateway, lalu me-resolve tenant lewat `ref_eksternal → pembayaran → pesanan.desa_id`. Idempotensi tepat-sekali via `webhook_pembayaran.event_id` UNIQUE. Signature invalid → `401` `kode` `webhook_signature_invalid`. Payload mentah disimpan untuk audit, **tak pernah** keluar ke API publik.

**Keranjang (cart) transient.** Tak ada tabel/endpoint keranjang. Keranjang hidup di client/Redis per-pengguna; `pesanan` baru lahir saat `POST /checkout`. Harga & nama **di-snapshot** saat checkout (`pesanan_item.*_snapshot`) — perubahan katalog setelahnya tak mengubah pesanan. Tradeoff §11.4.

**Invarian split escrow (dipaksa server).** Untuk tiap `transaksi`: `bruto = fee_platform + porsi_reinvestasi + neto_penyedia`, dengan `porsi_reinvestasi = bruto × pengaturan_desa.persen_reinvestasi` dan `fee_platform = bruto × persen_fee_platform`. Ledger **append-only**: refund = baris negatif, tak pernah update. Endpoint `GET …/transaksi` read-only; tak ada tulis langsung ke ledger.

**Kode error internal tambahan F2** (di dalam amplop `galat.kode`, HTTP mengikuti F0):

| `kode` internal | HTTP | Makna |
|---|---|---|
| `idempotency_key_wajib` | 422 | POST uang/poin tanpa `Idempotency-Key` |
| `transisi_ilegal` | 422 | Perpindahan status tak sah (warisan F1) |
| `slot_penuh` | 409 | Kuota slot habis / kalah race checkout |
| `stok_habis` | 409 | Stok produk fisik tak cukup |
| `saldo_poin_kurang` | 422 | Poin < `biaya_poin` saat tukar |
| `kupon_tidak_berlaku` | 422 | Kupon kedaluwarsa/limit/penyedia di luar cakupan/min belanja |
| `di_luar_geofence` | 422 | Verifikasi lokasi gagal `ST_DWithin` |
| `bukti_kurang` | 422 | Bukti verifikasi tak memenuhi `syarat` |
| `webhook_signature_invalid` | 401 | Signature webhook gateway invalid |
| `kebijakan_refund` | 422 | Refund melanggar kebijakan escrow (mis. setelah payout) |

---

## 2. Ringkasan endpoint

### Global (tanpa slug)
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| POST | `/webhooks/pembayaran/{gateway}` | Callback gateway (idempoten via `event_id`) | signature |

### Dermaga — commerce · `/desa/{slug}`
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| GET | `/desa/{slug}/slot` | Ketersediaan slot `?subjek_tipe=&subjek_id=&dari=&sampai=` | publik* |
| POST | `/desa/{slug}/slot` | Buat slot tunggal | penyedia pemilik/pengelola |
| POST | `/desa/{slug}/slot/batch` | Materialisasi slot rentang tanggal | penyedia pemilik/pengelola |
| PATCH | `/desa/{slug}/slot/{id}` | Ubah kuota/harga/status | penyedia pemilik/pengelola |
| DELETE | `/desa/{slug}/slot/{id}` | Tutup slot (bila `kuota_terpakai=0`) | penyedia pemilik/pengelola |
| POST | `/desa/{slug}/checkout` | Buat `pesanan` + hold kuota **[Idempotency-Key]** | wisatawan |
| GET | `/desa/{slug}/pesanan` | Daftar `?status=&milik=saya` | pembeli/penyedia/pengelola |
| GET | `/desa/{slug}/pesanan/{id\|kode}` | Detail pesanan | pembeli/penyedia terkait/pengelola |
| POST | `/desa/{slug}/pesanan/{id}/batal` | Batalkan (saat `menunggu_pembayaran`) → lepas kuota | pembeli/pengelola |
| PATCH | `/desa/{slug}/pesanan/{id}/item/{item_id}/fulfillment` | Update `status_fulfillment` barang fisik | penyedia item |
| GET | `/desa/{slug}/pesanan/{id}/pembayaran` | Daftar upaya bayar | pembeli/pengelola |
| POST | `/desa/{slug}/pesanan/{id}/pembayaran` | Buat/retry upaya bayar → redirect/QRIS **[Idempotency-Key]** | pembeli |
| POST | `/desa/{slug}/pembayaran/{id}/bukti` | Unggah bukti transfer manual | pembeli |
| POST | `/desa/{slug}/pembayaran/{id}/konfirmasi-manual` | Verifikasi transfer manual → rilis split **[Idempotency-Key]** | bendahara/pokdarwis/perangkat |
| GET | `/desa/{slug}/booking` | Daftar `?tanggal=&status=` | pembeli/penyedia/pengelola |
| GET | `/desa/{slug}/booking/{id\|kode_checkin}` | Detail booking | pembeli/penyedia/pengelola |
| POST | `/desa/{slug}/booking/{id}/checkin` | Check-in QR → `checkin` | agen/pokdarwis/perangkat |
| POST | `/desa/{slug}/booking/{id}/selesai` | Tandai selesai (atau via job auto) | penyedia/pengelola |

### Dermaga — escrow, payout, refund · `/desa/{slug}`
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| GET | `/desa/{slug}/transaksi` | Ledger `?penyedia_tipe=&penyedia_id=&status=` (read-only) | penyedia(diri)/pengelola |
| GET | `/desa/{slug}/rekening` | Daftar rekening payout | penyedia(diri)/pengelola |
| POST | `/desa/{slug}/rekening` | Tambah rekening | penyedia |
| PATCH | `/desa/{slug}/rekening/{id}` | Ubah / set `utama` | pemilik/pengelola |
| PATCH | `/desa/{slug}/rekening/{id}/verifikasi` | Set `terverifikasi` | pokdarwis/perangkat/admin |
| DELETE | `/desa/{slug}/rekening/{id}` | Hapus | pemilik/pengelola |
| GET | `/desa/{slug}/payout` | Daftar `?penyedia_id=&status=` | penyedia(diri)/pengelola |
| POST | `/desa/{slug}/payout` | Batch cairkan `transaksi` `dirilis` per penyedia **[Idempotency-Key]** | bendahara/pokdarwis/perangkat |
| POST | `/desa/{slug}/payout/{id}/transisi` | `tandai_berhasil\|tandai_gagal` (manual) | bendahara/pengelola |
| POST | `/desa/{slug}/refund` | Ajukan refund penuh/parsial **[Idempotency-Key]** | pembeli/pengelola |
| GET | `/desa/{slug}/refund` | Daftar `?status=&milik=saya` | pembeli/pengelola |
| GET | `/desa/{slug}/refund/{id}` | Detail | pembeli/pengelola |
| POST | `/desa/{slug}/refund/{id}/transisi` | `setuju\|tolak\|proses\|selesai` | pengelola |
| GET | `/desa/{slug}/pengaturan` | Parameter uang desa (subset publik) | publik/pengelola |
| PATCH | `/desa/{slug}/pengaturan` | Ubah `persen_reinvestasi`/fee/kebijakan **[blocker FGD]** | pokdarwis/perangkat/admin |

### Kupon & Tukar Poin · `/desa/{slug}`
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| GET | `/desa/{slug}/hadiah` | Katalog hadiah (global+lokal, `aktif`) | user |
| GET | `/desa/{slug}/hadiah/{id}` | Detail hadiah | user |
| POST | `/desa/{slug}/hadiah` | Buat hadiah | pokdarwis/perangkat/admin |
| PATCH | `/desa/{slug}/hadiah/{id}` | Ubah / nonaktif | pokdarwis/perangkat/admin |
| POST | `/desa/{slug}/tukar` | Tukar poin → `penukaran_poin` (+kupon) **[Idempotency-Key]** | user |
| GET | `/desa/{slug}/penukaran/saya` | Riwayat penukaran diri | user |
| GET | `/desa/{slug}/kupon/saya` | Kupon milik diri + publik berlaku | user |
| GET | `/desa/{slug}/kupon/{kode}/cek` | Pratinjau diskon `?total=&penyedia=` | user |
| POST | `/desa/{slug}/kupon` | Buat kupon promo (`promo_owner\|kampanye`) | owner/pengelola |

### Penjelajah Lestari + Verifikasi · `/desa/{slug}`
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| GET | `/desa/{slug}/misi` | Daftar misi `?jenis=&kategori=&stasiun_id=` | publik* |
| GET | `/desa/{slug}/misi/{id\|kode}` | Detail (+`micro_lesson` utk `belajar`) | user/publik* |
| POST | `/desa/{slug}/misi` | Buat misi | pokdarwis/perangkat/admin |
| PATCH | `/desa/{slug}/misi/{id}` | Ubah / nonaktif | pokdarwis/perangkat/admin |
| POST | `/desa/{slug}/misi/{id}/selesai` | Selesaikan misi → `stempel`+`verifikasi` | wisatawan |
| GET | `/desa/{slug}/stasiun` | Daftar stasiun (tanpa `qr_token` utk publik) | publik*/pengelola |
| POST | `/desa/{slug}/stasiun` | Buat stasiun QR | pokdarwis/perangkat/admin |
| PATCH | `/desa/{slug}/stasiun/{id}` | Ubah / rotasi `qr_token` | pokdarwis/perangkat/admin |
| DELETE | `/desa/{slug}/stasiun/{id}` | Nonaktifkan | pokdarwis/perangkat/admin |
| GET | `/desa/{slug}/paspor/saya` | Paspor Lestari diri (+`stempel[]`) | user |
| GET | `/desa/{slug}/stempel/saya` | Stempel diri `?status=` | user |
| GET | `/desa/{slug}/verifikasi` | Antrean `?entitas_tipe=&hasil=menunggu` | verifikator/pengelola |
| POST | `/desa/{slug}/verifikasi/{id}/putuskan` | Keputusan manual `valid\|invalid` | verifikator berperan |

### Pemandu (AI, ringan) · `/desa/{slug}`
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| POST | `/desa/{slug}/pemandu/itinerary` | Susun itinerary dari constraint (rule) | publik/anon |
| POST | `/desa/{slug}/pemandu/estimasi` | Estimasi harga item | publik/anon |
| POST | `/desa/{slug}/pemandu/chat` | Tanya-jawab (RAG ringan) `{sesi_id?}` | publik/anon |
| GET | `/desa/{slug}/pemandu/sesi/{id}` | Ambil sesi + riwayat | pemilik sesi |

\* *publik hanya melihat entitas layak-tayang (`aktif`/`buka`, `dihapus_pada IS NULL`); pengelola & pemilik melihat semua.*

---

## 3. Dermaga — checkout, slot, booking

### 3.1 Slot jadwal
`GET /desa/{slug}/slot?subjek_tipe=paket_wisata&subjek_id=…&dari=2026-07-10&sampai=2026-07-20` → daftar slot (`tanggal`, `waktu_mulai`, sisa = `kuota − kuota_terpakai`, `harga_override`, `status`). Publik hanya `status ∈ {buka, penuh}`.

`POST /desa/{slug}/slot/batch` — materialisasi kuota per tanggal dari `paket_wisata.kuota_default` (F1) untuk rentang tanggal (rekomendasi: dijalankan saat paket dipublikasi + job rolling window). Konflik `UNIQUE(subjek_tipe, subjek_id, tanggal, waktu_mulai)` → di-skip (idempoten), bukan `409`. Hanya penyedia pemilik subjek atau pengelola.

`PATCH …/slot/{id}` mengubah `kuota`/`harga_override`/`status`; menurunkan `kuota` di bawah `kuota_terpakai` → `422`. `DELETE` hanya jika `kuota_terpakai = 0`.

### 3.2 Checkout
`POST /desa/{slug}/checkout` — header `Idempotency-Key` wajib.
```json
// req
{ "kontak": { "nama": "Sinta", "telepon": "0812...", "email": "sinta@..." },
  "metode_ambil": "ambil_ditempat",
  "alamat_kirim": null,
  "kupon_id": "018f...",
  "item": [
    { "item_tipe": "paket_wisata", "item_id": "018f-paketA", "slot_jadwal_id": "018f-slotX",
      "jumlah": 1, "metadata": { "jumlah_orang": 2, "tanggal": "2026-07-12" } },
    { "item_tipe": "produk_jasa", "item_id": "018f-oleholeh", "jumlah": 3 }
  ] }
// 201
{ "pesanan": { "id":"018f...","kode_pesanan":"KLN-7Q3M","status":"menunggu_pembayaran",
    "subtotal":350000,"diskon":25000,"ongkir":0,"total":325000,
    "kedaluwarsa_pada":"2026-07-08T05:15:00Z", "item":[ … ] },
  "pembayaran": { "instruksi":"pilih_metode" } }
```
Efek atomik (satu transaksi DB, ERD §6): untuk tiap item berjadwal `SELECT slot_jadwal … FOR UPDATE`, cek `kuota_terpakai + jumlah ≤ kuota`, increment, buat `pesanan_item` + `booking(status=dipesan, kode_checkin)`; barang fisik cek `produk_jasa.stok`. Snapshot `nama_snapshot`/`harga_snapshot`. Terapkan `kupon` (§5). Set `kedaluwarsa_pada = now + pengaturan_desa.batas_hold_menit`. Kalah race / kuota habis → `409 slot_penuh`; stok kurang → `409 stok_habis`; **tak ada** side-effect parsial (rollback penuh). Kupon tak berlaku → `422 kupon_tidak_berlaku`. Referensi lintas-desa → `404`.

`POST …/pesanan/{id}/batal` (pembeli, saat `menunggu_pembayaran`) melepas kuota slot & mengembalikan stok. Job pelepas otomatis melakukan hal sama saat `kedaluwarsa_pada` lewat → `status=kedaluwarsa`.

### 3.3 Booking & check-in
`booking` 1-1 dengan `pesanan_item` berjadwal. `POST …/booking/{id}/checkin` memindai `kode_checkin` (QR tiket): guard peran (agen/pokdarwis/perangkat), pastikan `booking.status=terkonfirmasi` (harus sudah `dibayar`), set `checkin` + `checkin_pada`. Check-in di luar `tanggal_kunjungan` → `422 transisi_ilegal`. `POST …/booking/{id}/selesai` (atau job auto N hari) → `selesai`, memicu evaluasi rilis escrow (§4.2). Check-in ini juga sumber `pemakaian_kapasitas` F3 (`destinasi_id` + `tanggal_kunjungan`).

---

## 4. Dermaga — pembayaran, escrow, payout, refund

### 4.1 Pembayaran (dua jalur, satu bentuk)
`POST /desa/{slug}/pesanan/{id}/pembayaran` — header `Idempotency-Key` wajib.
```json
// req
{ "metode": "qris" }              // qris|va_bank|ewallet|kartu|transfer_manual
// 201 (jalur gateway)
{ "pembayaran": { "id":"018f...","metode":"qris","penyedia_gateway":"xendit",
    "status":"menunggu","redirect_url":"https://checkout.xendit.co/…",
    "kedaluwarsa_pada":"2026-07-08T05:15:00Z" } }
// 201 (jalur manual, tahap 1 PkM: pengaturan_desa.gateway="manual")
{ "pembayaran": { "id":"018f...","metode":"transfer_manual","penyedia_gateway":"manual",
    "status":"menunggu","instruksi_qris_statis":{ "url":"…","catatan":"Sertakan kode KLN-7Q3M" } } }
```
Retry menghasilkan baris `pembayaran` baru; maksimal satu `berhasil`. Klien yang kembali dari `redirect_url` **tidak** mengubah status — hanya webhook (§4.5) yang berwenang.

**Jalur manual:** `POST …/pembayaran/{id}/bukti` unggah `bukti_media_id` (foto transfer). `POST …/pembayaran/{id}/konfirmasi-manual` (bendahara/pokdarwis, `Idempotency-Key`) memverifikasi → `pembayaran.status=berhasil` + jalankan split escrow (§4.2). Pembeli **tak boleh** mengonfirmasi pembayarannya sendiri → `403`.

### 4.2 Split escrow (saat pembayaran `berhasil`)
Dipicu webhook `berhasil` **atau** `konfirmasi-manual`. Per penyedia dalam pesanan, tulis `transaksi(jenis=penjualan, status=tertahan_escrow)` dengan `porsi_reinvestasi = bruto × persen_reinvestasi`, `fee_platform = bruto × persen_fee_platform`, `neto_penyedia = bruto − fee − reinvestasi`. `pesanan.status → dibayar`; potong `produk_jasa.stok`; `booking.status → terkonfirmasi`. Idempoten via `webhook.event_id`/`Idempotency-Key`. Dana tertahan di **sub-account escrow gateway** (ADR-02 §8), bukan di neraca platform.

### 4.3 Rilis & payout
`pesanan → selesai` (kunjungan `checkin`+selesai, atau barang `diterima`, atau auto N hari) → `transaksi.status = dirilis`. `POST /desa/{slug}/payout` (bendahara, `Idempotency-Key`) mengumpulkan `transaksi` `dirilis` + `payout_id IS NULL` untuk satu `(penyedia_tipe, penyedia_id)` ke satu `payout`. `metode=disbursement` (API gateway, tahap lanjut) atau `manual` (transfer bendahara, tahap 1). Tak ada dobel payout (transaksi ter-`payout_id`). `POST …/payout/{id}/transisi {aksi:"tandai_berhasil"}` menutup payout manual; `tandai_gagal` melepas transaksi agar bisa dipayout ulang. Inflow `porsi_reinvestasi` → `dana_konservasi` di F3.

### 4.4 Refund
`POST /desa/{slug}/refund` (`Idempotency-Key`): `{ pesanan_id, pesanan_item_id?, alasan, jumlah? }` → `refund(status=diajukan)`. `POST …/refund/{id}/transisi {aksi:"setuju|tolak|proses|selesai"}` (pengelola). `setuju→proses` menulis `transaksi(jenis=refund)` baris **negatif** + entri refund gateway (atau catatan manual). **Kebijakan default (tradeoff sadar, ERD §3):** refund mudah **sebelum** `payout`/`selesai`; setelah dirilis → clawback rumit → default `422 kebijakan_refund`, dialihkan ke jalur manual bendahara. Besaran & syarat rilis = `pengaturan_desa.kebijakan_pembatalan`.

### 4.5 Webhook gateway
`POST /webhooks/pembayaran/{gateway}` (global): verifikasi signature → `401 webhook_signature_invalid` bila gagal. Tulis `webhook_pembayaran` (`event_id` UNIQUE → tepat-sekali; duplikat = `200` no-op). Resolve `ref_eksternal → pembayaran → desa_id`. Event `settle/berhasil` → §4.2; `gagal/expire` → `pembayaran.status` sesuai; `refund` gateway → sinkron `refund`. **Selalu `200`** ke gateway setelah tercatat (proses async internal) agar gateway tak retry berlebih.

### 4.6 Pengaturan desa
`GET /desa/{slug}/pengaturan` → publik melihat subset transparansi (`persen_reinvestasi`, `kebijakan_pembatalan`) — ini pembeda non-OTA yang sengaja **terlihat**. Pengelola melihat penuh (kecuali `konfig_gateway` yang berisi rahasia sub-account → **tak pernah** keluar). `PATCH` (pokdarwis/perangkat/admin).
> **Blocker non-teknis (guardrail):** `persen_reinvestasi`, syarat rilis escrow, dan `kebijakan_pembatalan` **wajib disepakati FGD** dengan Pokdarwis/perangkat desa **sebelum go-live**. Endpoint ada, tapi nilai default tak boleh diasumsikan sepihak.

---

## 5. Kupon & Tukar Poin

`GET /desa/{slug}/hadiah` → katalog (`desa_id=null` global + lokal, `aktif`), tiap item `{ id, kode, nama, jenis, biaya_poin, stok, syarat, media }`.

`POST /desa/{slug}/tukar` (`Idempotency-Key`):
```json
{ "hadiah_id": "018f..." }   // → 201 { "penukaran": {…}, "kupon": {…}|null }
```
Efek atomik (satu transaksi DB, ERD §6): lock saldo poin (`SUM(transaksi_poin.poin)` per `(pengguna, desa)`), validasi `≥ biaya_poin` & `syarat` (mis. `{"tingkat_min":"bahari"}` dari `sertifikasi_owner`), buat `penukaran_poin`, tulis `transaksi_poin` **negatif** (`kode_aksi="tukar_hadiah"`, `referensi=(penukaran_poin, id)` — idempoten via constraint F1), potong `stok`, terbitkan `kupon` bila `jenis=kupon_diskon`. Saldo kurang → `422 saldo_poin_kurang`; syarat tak terpenuhi → `422`; stok habis → `409 stok_habis`. Redeem ganda dengan `Idempotency-Key` sama → response tersimpan (tak menggandakan).

`GET …/kupon/{kode}/cek?total=325000&penyedia=umkm:018f` → pratinjau `{ berlaku, diskon, alasan? }` untuk UX checkout (validasi final tetap saat checkout). `penyedia_terbatas` menutup flywheel Misi Kiluan — kanal "diskon dari UMKM bersertifikat" (mis. `{"tingkat":"lumba_lumba"}`).

`POST …/kupon` membuat kupon `promo_owner|kampanye` (owner untuk promonya, pengelola untuk kampanye). Penerapan saat checkout mencatat `pemakaian_kupon` (`UNIQUE(kupon,pesanan)`) + increment `terpakai` atomik.

---

## 6. Penjelajah Lestari + Verifikasi

### 6.1 Misi & stasiun
`GET /desa/{slug}/misi` → daftar quest. `jenis=belajar` membuka `micro_lesson` (edukasi kode etik lumba/karang/sampah) yang **wajib** sebelum `aksi`. Detail menyertakan `syarat_verifikasi` (metode, geofence, bukti). `GET …/stasiun` publik menyembunyikan `qr_token`; pengelola melihatnya. Stasiun `POST/PATCH/DELETE` oleh pengelola; `PATCH` merotasi `qr_token`.

### 6.2 Menyelesaikan misi
`POST /desa/{slug}/misi/{id}/selesai`:
```json
{ "booking_id": "018f...|null",
  "bukti": { "qr_token": "STN-abc123", "lokasi": { "lat": -5.75, "lng": 105.12 },
             "foto_media_id": "018f...|null" },
  "dampak": { "mangrove": 5 } }
// → 201 { "stempel": { "status": "terverifikasi|menunggu_verifikasi" }, "verifikasi": {…} }
```
Buat `stempel(status=menunggu_verifikasi)` + `verifikasi` sesuai `misi.syarat_verifikasi`. **Verifikasi sinkron** untuk metode otomatis: `qr_checkin` mencocokkan `qr_token` stasiun + `ST_DWithin(lokasi, stasiun.lokasi, radius_m)`; `otomatis` (mis. misi `belajar` tuntas) langsung `valid`. Lolos → `stempel=terverifikasi`, update `paspor_lestari.ringkasan_dampak` + `total_stempel`. Gagal geofence → `422 di_luar_geofence`; bukti kurang → `422 bukti_kurang`. Metode `konfirmasi_pemandu` tetap `menunggu` sampai keputusan manual (§6.3). **Hanya `terverifikasi`** yang masuk paspor & (F3) `neraca_regeneratif` — pintu anti-greenwashing.

### 6.3 Verifikasi manual
`GET /desa/{slug}/verifikasi?entitas_tipe=stempel&hasil=menunggu` (verifikator). `POST …/verifikasi/{id}/putuskan { "hasil":"valid|invalid", "catatan":"…" }` oleh `verifikator_id` berperan (agen/pokdarwis/perangkat). `valid` → `stempel=terverifikasi` + update paspor; `invalid` → `ditolak`. `verifikasi` generik juga menaungi `entitas_tipe=pengajuan_kartu` (F1) — jalur bukti mulai bisa dipakai; endpoint F1 tak berubah, hanya boleh menautkan `verifikasi`.

---

## 7. Pemandu (AI, rule-based)

`POST /desa/{slug}/pemandu/itinerary`:
```json
{ "durasi_hari": 2, "minat": ["lumba","mangrove"], "budget": 500000,
  "tanggal_mulai": "2026-07-12", "jumlah_orang": 2 }
// → 200 { "sesi_id":"018f...","itinerary":[ {hari,slot[],perkiraan_biaya} ], "model_dipakai":"rule" }
```
Menyusun dari `constraint` atas data lokal (`destinasi`, `layanan`, `paket`, `kalender`), **menghormati kuota `slot_jadwal`** (tak menyarankan slot penuh). `POST …/estimasi` menjumlah harga sumber. `POST …/chat { sesi_id?, pesan }` retrieval ringan atas konten destinasi; menyimpan `percakapan_pemandu` + `sumber` (RAG refs) bila sesi dibuat. `model_dipakai` default `rule`; `llm` **di-gate** di belakang service sendiri (bisa dimatikan — kendali biaya & kedaulatan data), tak diaktifkan tahap 1 PkM. Sesi anonim (`pengguna_id=null`) diizinkan; `GET …/pemandu/sesi/{id}` hanya untuk pemilik/pemegang token sesi.

---

## 8. Skema objek (DTO ringkas)

Nama field ikut ERD. Field sensitif **tak pernah** keluar: `pembayaran.mentah`, `webhook_pembayaran.muatan`, `pengaturan_desa.konfig_gateway`, `stasiun_lestari.qr_token` (publik), nomor `rekening_penyedia` (dimask `••••1234`).

**PengaturanDesa (publik):** `persen_reinvestasi, kebijakan_pembatalan`. **(pengelola):** + `persen_fee_platform, batas_hold_menit, gateway`.
**Pesanan (ringkas):** `id, kode_pesanan, status, subtotal, diskon, ongkir, total, kedaluwarsa_pada, dibuat_pada`.
**Pesanan (detail):** ringkas + `metode_ambil, kontak, item[], pembayaran_terakhir{status,metode}|null`.
**PesananItem:** `id, item_tipe, item_id, nama_snapshot, harga_snapshot, jumlah, satuan, subtotal, penyedia{tipe,id,nama}, status_fulfillment, booking{id,kode_checkin,status}|null, metadata`.
**SlotJadwal:** `id, subjek_tipe, subjek_id, tanggal, waktu_mulai, waktu_selesai, kuota, sisa, harga_override|null, status`.
**Booking:** `id, kode_checkin, slot_jadwal{id,tanggal,waktu_mulai}, destinasi{id,nama}|null, jumlah_orang, tanggal_kunjungan, status, checkin_pada|null`.
**Pembayaran:** `id, metode, penyedia_gateway, jumlah, status, redirect_url|null, bukti_media{url}|null, kedaluwarsa_pada, dibayar_pada|null` *(tanpa `mentah`)*.
**Transaksi:** `id, pesanan_id, penyedia{tipe,id}, jenis, bruto, fee_platform, porsi_reinvestasi, neto_penyedia, status, payout_id|null, dibuat_pada`.
**Payout:** `id, penyedia{tipe,id}, rekening{jenis,nomor_mask}, jumlah, metode, status, ref_eksternal|null, catatan, dibuat_pada, diproses_pada|null`.
**RekeningPenyedia:** `id, penyedia{tipe,id}, jenis, bank_kode|null, nomor_mask, nama_pemilik, terverifikasi, utama` *(nomor penuh tak keluar)*.
**Refund:** `id, pesanan_id, pesanan_item_id|null, alasan, jumlah, status, dibuat_pada, selesai_pada|null`.
**KatalogHadiah:** `id, kode, nama, deskripsi, jenis, biaya_poin, stok|null, syarat, media{url}|null, aktif`.
**PenukaranPoin:** `id, hadiah{id,nama}, poin_dipakai, kupon{id,kode}|null, status, dibuat_pada`.
**Kupon:** `id, kode, sumber, tipe_diskon, nilai, min_belanja|null, batas_pakai, terpakai, penyedia_terbatas|null, berlaku_mulai|null, berlaku_sampai|null, status`.
**Misi:** `id, kode, judul, deskripsi, jenis, kategori, micro_lesson|null, syarat_verifikasi, stasiun{id,nama}|null, poin, badge{id,nama}|null, dampak_template, aktif`.
**StasiunLestari (publik):** `id, nama, tipe, destinasi{id,nama}|null, lokasi{lat,lng}, radius_m, aktif` *(tanpa `qr_token`)*.
**PasporLestari:** `id, ringkasan_dampak, total_stempel, stempel[], diperbarui_pada`.
**Stempel:** `id, misi{id,judul}, booking_id|null, stasiun{id,nama}|null, dampak, status, lokasi{lat,lng}|null, media{url}|null, dibuat_pada`.
**Verifikasi:** `id, entitas_tipe, entitas_id, metode, verifikator{id,nama}|null, hasil, dibuat_pada, diputuskan_pada|null`.
**SesiPemandu:** `id, tipe, masukan, keluaran|null, model_dipakai, dibuat_pada`.
**PercakapanPemandu:** `id, peran, isi, sumber|null, dibuat_pada`.

Geo `lokasi` = `{lat,lng}` (backend `ST_SetSRID(ST_MakePoint(lng,lat),4326)`), sama F0.

---

## 9. Matriks otorisasi (ringkas)

| Aksi | Wisatawan/pembeli | UMKM/Agen (penyedia) | Bendahara/Pokdarwis/Perangkat | Admin |
|---|---|---|---|---|
| Checkout, bayar, upload bukti, batal | ✅ (diri) | — | — | ✅ |
| Kelola `slot_jadwal` subjek | — | ✅ (pemilik) | ✅ | ✅ |
| Update `status_fulfillment` | — | ✅ (item-nya) | ✅ | ✅ |
| `konfirmasi-manual` pembayaran | ❌ | ❌ | ✅ | ✅ |
| Check-in booking | — | ✅ (agen) | ✅ | ✅ |
| Lihat `transaksi`/`payout` | — | ✅ (diri) | ✅ (semua) | ✅ |
| Jalankan `payout` | — | ❌ | ✅ | ✅ |
| Kelola `rekening_penyedia` | — | ✅ (diri) | verifikasi | ✅ |
| Ajukan refund | ✅ (diri) | — | ✅ | ✅ |
| Putuskan refund/`transisi` | ❌ | ❌ | ✅ | ✅ |
| `PATCH /pengaturan` | ❌ | ❌ | ✅ | ✅ |
| Tukar poin, pakai kupon | ✅ | ✅ | ✅ | ✅ |
| Kelola hadiah/kupon kampanye | ❌ | promo owner-nya | ✅ | ✅ |
| Kelola misi/stasiun | ❌ | ❌ | ✅ | ✅ |
| Selesaikan misi (`stempel`) | ✅ | ✅ | ✅ | ✅ |
| Putuskan `verifikasi` manual | ❌ | ✅ (sbg pemandu) | ✅ | ✅ |

Lintas-tenant selalu `404` (F0). Cek kepemilikan (F1) berlaku: penyedia hanya subjek/transaksi/rekeningnya; pengelola desa melewati cek kepemilikan dalam desanya.

---

## 10. Tradeoff arsitektur (jujur)

1. **`Idempotency-Key` header vs kunci turunan.** Dipilih header untuk POST uang/poin karena retry checkout terjadi sebelum `pesanan` ada — tak ada kunci alami. Biaya: klien wajib menghasilkan & menyimpan UUID; server simpan map di Redis (TTL). Alternatif `kode_pesanan` sebagai kunci ditolak (belum ada saat request pertama).
2. **Webhook di luar path tenant + resolve via `ref_eksternal`.** Gateway tak tahu `slug`. Biaya: handler wajib tenant-hati (resolve `desa_id` dari `pembayaran`), dan satu URL menampung semua desa. Alternatif URL per-desa (`/desa/{slug}/webhook`) layak **hanya** bila tiap desa punya akun gateway terpisah — ditunda ke F4 saat provisioning per-tenant matang.
3. **Status uang bukan verba klien.** Hanya webhook/aksi-manusia-berperan yang memindah status pembayaran/escrow; `/transisi` F1 dipakai ulang terbatas (refund, payout manual). Untung: uang selalu system-authoritative, klien tak bisa mengaku "dibayar". Biaya: dua pola transisi hidup berdampingan (kurasi vs uang) — didokumentasikan tegas agar tak rancu.
4. **Keranjang transient (tanpa endpoint).** `pesanan` lahir saat checkout; harga di-snapshot. Untung: minim bug harga basi, tak ada state keranjang server. Biaya: keranjang tak lintas-perangkat kecuali disinkron Redis per-pengguna. Cukup untuk F2.
5. **Manual-first, gateway-ready satu bentuk.** Jalur manual (QRIS statis + bukti + `konfirmasi-manual`) memakai **jalur split escrow yang sama** dengan webhook. Untung: nol dependensi gateway untuk PkM; pindah ke otomatis = ubah `pengaturan_desa.gateway`. Biaya: manusia dalam loop (latensi + kepercayaan bendahara); mitigasi lewat audit `webhook_pembayaran`/`transaksi` append-only.
6. **Kebijakan refund konservatif.** Default refund hanya sebelum `payout`/`selesai`; sesudahnya clawback rumit → jalur manual (`422 kebijakan_refund`). Untung: sederhana & aman tahap 1. Biaya: pengalaman refund pasca-rilis kurang mulus; diperbaiki saat disbursement/refund otomatis Tahun 4–5.
7. **Verifikasi sinkron untuk metode otomatis.** `qr_checkin`/`otomatis` diputus di request-path (geofence `ST_DWithin`); `konfirmasi_pemandu` async. Untung: umpan balik paspor instan, memperkuat loop gamifikasi. Biaya: cek geografis di jalur panas — murah dengan GIST index, dipantau bila jadi hotspot.
8. **Boost kupon UMKM bersertifikat — risiko rich-get-richer (bukan teknis).** `penyedia_terbatas` mengarahkan diskon ke owner tingkat tinggi bisa memperlebar ketimpangan — bertentangan dengan misi inklusif. Rekomendasi: kampanye desa yang **juga** mengangkat owner Tunas + rotasi eksposur; keputusan tata kelola Pokdarwis, bukan sekadar filter query. (Selaras tradeoff F1 §9.7.)
9. **Pemandu rule-based dulu, LLM di-gate.** Deterministik, murah, berdaulat data. Biaya: kualitas jawaban terbatas dib/LLM; slot `model_dipakai=llm` disiapkan tapi mati by default demi kendali biaya & data.

---

## 11. Gerbang `pytest` (uji kontrak F2)

- **Checkout konsisten:** `201` dengan `total = subtotal − diskon + ongkir`; membuat `pesanan_item` + `booking` sinkron; snapshot harga tak berubah bila katalog diubah setelahnya.
- **Idempotensi checkout:** dua request `Idempotency-Key` sama → satu `pesanan` (response identik); tanpa header → `422 idempotency_key_wajib`.
- **Anti-overbook (race):** dua checkout paralel slot sisa 1 → satu `201`, satu `409 slot_penuh`; `kuota_terpakai` tak pernah > `kuota`. Hold kedaluwarsa melepas kuota & stok.
- **Kanal bayar:** status jadi `berhasil` hanya via webhook terverifikasi / `konfirmasi-manual`; redirect klien saja tak mengubah. Webhook `event_id` sama diproses **tepat-sekali** (tak menggandakan `transaksi`). Signature invalid → `401 webhook_signature_invalid`. Pembeli mengonfirmasi pembayaran sendiri → `403`.
- **Split benar:** `GET /transaksi` memenuhi `bruto = fee_platform + porsi_reinvestasi + neto_penyedia`; `porsi_reinvestasi = bruto × persen_reinvestasi` per `pengaturan_desa`.
- **Rilis & payout:** `pesanan → selesai` menandai `transaksi=dirilis`; `POST /payout` hanya mengambil `dirilis` `payout_id IS NULL`; tak ada dobel payout; `Idempotency-Key` sama tak menggandakan.
- **Refund:** sebelum payout → baris `transaksi` negatif + `refunded`; setelah `selesai` → `422 kebijakan_refund` (jalur manual).
- **Tukar poin:** saldo kurang → `422 saldo_poin_kurang`; sukses menulis `transaksi_poin` negatif idempoten & potong stok; redeem `Idempotency-Key` sama tak menggandakan; `syarat` tingkat tak terpenuhi → `422`.
- **Kupon:** kedaluwarsa/limit/penyedia luar cakupan/min belanja → `422 kupon_tidak_berlaku`; `UNIQUE(kupon,pesanan)` cegah pakai ganda.
- **Verifikasi:** stempel di luar geofence → `422 di_luar_geofence`; tanpa bukti sesuai `syarat` → `422 bukti_kurang`; hanya `terverifikasi` menaikkan `paspor_lestari`.
- **Pemandu:** itinerary tak menyarankan slot `penuh`; `estimasi` menjumlah harga sumber benar; sesi anonim boleh, `GET sesi` orang lain → `404`.
- **Isolasi tenant & kepemilikan:** `pesanan`/`pembayaran`/`transaksi`/`booking` desa A tak terlihat desa B (`404`); penyedia tak melihat `transaksi` penyedia lain; referensi lintas-desa saat checkout → `404`.
- **Paginasi keyset:** stabil saat baris ditambah di tengah iterasi (pesanan/transaksi/booking/misi).

---

## 12. Batas F2 (kontrak yang sengaja ditunda)

- **F3 (Analitik + Regeneratif):** `dana_konservasi` (inflow dari `transaksi.porsi_reinvestasi`), `pemakaian_kapasitas` (dari `booking`+check-in; opsional blokir booking saat spot merah), `neraca_regeneratif` (distribusi dari `neto_penyedia`), `monitoring_ekologi` + perluasan `verifikasi.entitas_tipe`, validasi silang `stempel.dampak` ↔ monitoring, outbox `peristiwa` (`transaksi_settle`, `booking_selesai`, `stempel_terverifikasi`).
- **F4 (Kemandirian):** `pengaturan_desa` + `bahasa`/`zona_waktu`/`status_go_live`, tema/white-label, ekspor data, webhook per-desa (§10.2), provisioning multi-desa (semua tabel F2 sudah ber-`desa_id`).
- **Ditunda dalam F2 (thin slice PkM):** disbursement/refund otomatis gateway, LLM Pemandu (rule-based dulu), riwayat chat penuh — dirancang, dinyalakan Tahun 4–5.

Seluruh endpoint F2 sudah ber-slug/tenant & ber-`desa_id` sejak awal → penambahan modul lanjut = tambah resource, bukan refactor kontrak.

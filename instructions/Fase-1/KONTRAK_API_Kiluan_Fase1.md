# Kontrak API Fase 1 — Kiluan

**Cakupan:** **Pasar Desa** (UMKM, produk/jasa, paket wisata + itinerary) · **Dapur Konten** (kontribusi crowdsource + kurasi) · **Lencana Warga** (poin, badge, leaderboard) · **seed Misi Kiluan** sisi owner (*Naik Kelas Lestari*: kartu aksi, pengajuan, sertifikasi).
**Diturunkan dari:** `ERD_Kiluan_Fase1.md` (13 tabel baru + 2 ALTER F0). Nama field snake_case Bahasa Indonesia persis seperti ERD.
**Mewarisi:** seluruh konvensi `KONTRAK_API_Kiluan_Fase0.md` (§1) — base path, auth, tenant path, keyset pagination, amplop error, soft delete, rate-limit. Dokumen ini hanya menambah yang **baru**.
**Status:** kandidat ADR-04. Kunci ini sebelum scaffold + `pytest` F1.

---

## 1. Tambahan konvensi (di atas F0 §1)

**Transisi state-machine.** Semua perpindahan status dikurasi lewat satu bentuk endpoint seragam:
```
POST /desa/{slug}/{resource}/{id}/transisi   { "aksi": "...", "catatan": "opsional" }
```
`aksi` memakai kosakata **sama dengan `kurasi_log.keputusan`**: `ajukan | setuju | tolak | minta_revisi` (+ `arsip` untuk paket, lihat catatan §2.3). Guard peran & efek samping berbeda per resource, tapi bentuk request/response identik. Setiap transisi kurasi menulis satu baris `kurasi_log` (append-only). Transisi ilegal → `422 validasi_gagal` dengan `kode` internal `transisi_ilegal`. Response = objek resource ter-update.

> Catatan UI: pada `pengajuan_kartu`, `aksi:"setuju"` ditampilkan sebagai "Validasi"; domain action tetap `setuju` agar enum log seragam.

**Idempotensi award poin.** Award tidak pernah lewat endpoint publik. Ia dipicu **event domain** (mis. `kontribusi→disetujui`) di dalam service, menulis `transaksi_poin` dengan `(pengguna_id, kode_aksi, referensi_tipe, referensi_id)` unik. Retry/klik-ganda aman: constraint unik menolak baris kedua → award idempoten. Tak ada `POST /poin`.

**Polimorfik tanpa FK keras.** `kontribusi.target_*`, `pengajuan_kartu.subjek_*`, `kurasi_log.entitas_*` dijaga aplikasi (validasi `tipe`+eksistensi di service), bukan FK DB. Konsekuensi: tak ada cascade; service wajib memvalidasi target hidup & se-tenant.

**Kepemilikan (ownership).** Sejumlah aksi F1 dibatasi ke pemilik resource, bukan sekadar peran: owner UMKM hanya mengelola UMKM-nya; agen hanya paketnya; penyumbang hanya kontribusinya. Dependency `wajib_peran(...)` diperluas dengan cek kepemilikan (`umkm.pengguna_id`, `paket.agen_id`, `kontribusi.penyumbang_id`). Pengelola desa (`pokdarwis|perangkat_desa|admin`) melewati cek kepemilikan.

**Lampiran diperluas (ALTER F0).** `media_lampiran.entitas_tipe` kini menerima `umkm | produk_jasa | paket_wisata | kontribusi`. Endpoint lampiran F0 (`POST /desa/{slug}/lampiran`, dst.) tidak berubah — hanya enum yang bertambah. Foto kontribusi punya jalur cepat via `kontribusi.media_id` (tunggal), sedangkan galeri UMKM/produk/paket lewat lampiran polimorfik (banyak).

---

## 2. Ringkasan endpoint

### Global (tanpa slug)
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| GET | `/bidang-usaha` | Taksonomi UMKM (lookup global) | publik |

### Pasar Desa — `/desa/{slug}`
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| GET | `/desa/{slug}/umkm` | Cari/daftar UMKM | publik* |
| GET | `/desa/{slug}/umkm/{id}` | Detail UMKM + sertifikasi | publik* |
| POST | `/desa/{slug}/umkm` | Daftarkan UMKM (`menunggu`) | umkm |
| PATCH | `/desa/{slug}/umkm/{id}` | Ubah profil UMKM | pemilik/pengelola |
| PATCH | `/desa/{slug}/umkm/{id}/verifikasi` | Set `terverifikasi`/`ditolak` | pokdarwis/perangkat/admin |
| DELETE | `/desa/{slug}/umkm/{id}` | Soft delete | pemilik/pengelola |
| GET | `/desa/{slug}/produk` | Daftar produk/jasa | publik* |
| GET | `/desa/{slug}/produk/{id}` | Detail | publik* |
| POST | `/desa/{slug}/produk` | Buat (`draft`) | pemilik umkm/pengelola |
| PATCH | `/desa/{slug}/produk/{id}` | Ubah | pemilik/pengelola |
| PATCH | `/desa/{slug}/produk/{id}/status` | `draft↔publikasi↔arsip` | pemilik/pengelola |
| DELETE | `/desa/{slug}/produk/{id}` | Soft delete | pemilik/pengelola |
| GET | `/desa/{slug}/paket` | Cari/daftar paket | publik* |
| GET | `/desa/{slug}/paket/{id\|slug}` | Detail + itinerary | publik* |
| POST | `/desa/{slug}/paket` | Buat (`draft`) | agen |
| PATCH | `/desa/{slug}/paket/{id}` | Ubah metadata | pemilik agen/pengelola |
| POST | `/desa/{slug}/paket/{id}/transisi` | State machine paket | agen/kurator |
| DELETE | `/desa/{slug}/paket/{id}` | Soft delete | pemilik/pengelola |
| POST | `/desa/{slug}/paket/{id}/item` | Tambah item itinerary | pemilik/pengelola |
| PATCH | `/desa/{slug}/paket/{id}/item/{item_id}` | Ubah item | pemilik/pengelola |
| DELETE | `/desa/{slug}/paket/{id}/item/{item_id}` | Hapus item (hard) | pemilik/pengelola |

### Dapur Konten — `/desa/{slug}`
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| POST | `/desa/{slug}/kontribusi` | Kirim kontribusi (`menunggu`) | user berperan |
| GET | `/desa/{slug}/kontribusi` | Antrean kurasi / `?milik=saya` | kurator / penyumbang |
| GET | `/desa/{slug}/kontribusi/{id}` | Detail | penyumbang/kurator |
| PATCH | `/desa/{slug}/kontribusi/{id}` | Revisi muatan (saat `revisi`) | penyumbang |
| POST | `/desa/{slug}/kontribusi/{id}/transisi` | Kurasi + kirim ulang | kurator/penyumbang |
| GET | `/desa/{slug}/kurasi/log` | Audit transisi `?entitas_tipe=&entitas_id=` | kurator |

### Lencana Warga — `/desa/{slug}`
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| GET | `/desa/{slug}/poin/saya` | Saldo + riwayat diri | user |
| GET | `/desa/{slug}/leaderboard` | Papan peringkat desa `?periode=` | publik |
| GET | `/desa/{slug}/badge` | Katalog badge (global+lokal) | publik |
| GET | `/desa/{slug}/badge/saya` | Badge yang dimiliki diri | user |
| GET | `/desa/{slug}/aturan-poin` | Referensi aturan poin | publik |

### Naik Kelas Lestari (seed) — `/desa/{slug}`
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| GET | `/desa/{slug}/kartu-aksi` | Katalog kartu (template+lokal) | user |
| GET | `/desa/{slug}/kartu-aksi/{id}` | Detail + `kenapa_penting` | user |
| POST | `/desa/{slug}/pengajuan-kartu` | Ajukan kartu + bukti (`menunggu`) | owner subjek |
| GET | `/desa/{slug}/pengajuan-kartu` | Antrean validasi / `?milik=saya` | validator/owner |
| GET | `/desa/{slug}/pengajuan-kartu/{id}` | Detail | owner/validator |
| PATCH | `/desa/{slug}/pengajuan-kartu/{id}` | Revisi bukti (saat `revisi`) | owner |
| POST | `/desa/{slug}/pengajuan-kartu/{id}/transisi` | Validasi + kirim ulang | validator/owner |
| GET | `/desa/{slug}/sertifikasi` | Tingkat subjek `?subjek_tipe=&subjek_id=` | publik |

\* *publik hanya melihat entitas layak-tayang (`status=publikasi`/`terverifikasi`, `dihapus_pada IS NULL`); pengelola & pemilik melihat semua status.*

---

## 3. Pasar Desa

### 3.1 `bidang-usaha` (lookup global)
`GET /bidang-usaha` → array `{ id, kode, nama, ikon }`. Setara `/kategori` F0: dipakai untuk filter Pasar Desa (`kuliner`, `kerajinan`, `homestay`, `jasa_wisata`, `hasil_laut`, …). Global, tak ber-slug.

### 3.2 UMKM
`GET /desa/{slug}/umkm?bidang=&status=&dekat=lat,lng&radius_m=&q=&batas=&kursor=`. Publik hanya `status_verifikasi=terverifikasi`. Bila `dekat` dipakai → `jarak_m` + urut jarak (GIST `lokasi`); selain itu keyset `dibuat_pada` desc.

`POST /desa/{slug}/umkm`:
```json
{ "nama": "Kopi Kiluan", "bidang_id": 2, "deskripsi": "...",
  "telepon": "0812...", "whatsapp": "0812...", "alamat": "Pekon Kiluan Negeri",
  "lokasi": { "lat": -5.79, "lng": 105.10 } }
// → 201, status_verifikasi="menunggu", pengguna_id = pemilik token
```
Pemohon **wajib** punya keanggotaan `umkm` aktif di desa ini. `lokasi` opsional. `PATCH` = partial update field sama (pemilik/pengelola).

`PATCH /desa/{slug}/umkm/{id}/verifikasi { "keputusan": "terverifikasi" }` — target `terverifikasi|ditolak`, set `diverifikasi_oleh`. Hanya pengelola. **Implikasi:** UMKM non-`terverifikasi` tak bisa mem-`publikasi` produk (§3.3) — produk boleh dibuat `draft` tapi transisi ke `publikasi` ditolak `422`.

`DELETE` = soft delete → produk turut hilang dari publik (filter join).

### 3.3 Produk/Jasa
`GET /desa/{slug}/produk?umkm_id=&jenis=&bidang=&status=&q=&batas=&kursor=`. Publik hanya `publikasi` dari UMKM `terverifikasi`.

`POST /desa/{slug}/produk`:
```json
{ "umkm_id": "018f...", "nama": "Kopi robusta 250g", "jenis": "produk",
  "deskripsi": "...", "harga": 45000, "satuan_harga": "per_item",
  "stok": 30, "status": "draft" }
// → 201
```
`jenis`: `produk|jasa` (`jasa` → `stok=null`). `satuan_harga` = enum F0. Pembuat harus pemilik `umkm_id` (atau pengelola). `PATCH /produk/{id}/status { "status": "publikasi" }` → `draft|publikasi|arsip`; **`publikasi` menuntut UMKM terverifikasi** (`422` bila tidak). Galeri via lampiran `entitas_tipe="produk_jasa"`.

### 3.4 Paket Wisata + itinerary
`GET /desa/{slug}/paket?agen_id=&status=&q=&batas=&kursor=`. Publik hanya `publikasi`.

`POST /desa/{slug}/paket`:
```json
{ "slug": "trip-lumba-2h1m", "nama": "Trip Lumba-lumba 2H1M",
  "deskripsi": "...", "durasi_jam": 30, "harga": 750000,
  "satuan_harga": "per_paket", "kuota_default": 8 }
// → 201, status="draft", agen_id = pengguna token
```
Pembuat wajib berperan `agen`. `UNIQUE(desa_id, slug)` → bentrok `409`. Penjadwalan per-tanggal & kuota harian **bukan** di sini — itu F2 (Dermaga).

`GET /desa/{slug}/paket/{id|slug}` (detail) menyertakan `item[]` terurut `(hari, urutan)`.

**Itinerary (`paket_item`)** sebagai sub-resource:
```json
// POST /desa/{slug}/paket/{id}/item
{ "hari": 1, "urutan": 2, "judul": "Snorkeling Pulau Kelapa",
  "deskripsi": "...", "destinasi_id": "018f...", "layanan_id": null,
  "produk_jasa_id": null, "durasi_menit": 120 }
```
Aturan validasi: item **harus** punya minimal satu referensi (`destinasi_id`/`layanan_id`/`produk_jasa_id`) **atau** `judul` terisi (item bebas) — item tanpa keduanya ditolak `422`. Referensi wajib se-tenant & hidup. `PATCH`/`DELETE` (hard) per item.

**Transisi paket** — lihat §6.1.

---

## 4. Dapur Konten

### 4.1 Kontribusi (crowdsource)
`POST /desa/{slug}/kontribusi`:
```json
{ "tipe": "koreksi_data", "target_tipe": "destinasi", "target_id": "018f...",
  "muatan": { "field": "jam_operasional", "usulan": "06:00-17:00", "alasan": "..." },
  "media_id": null }
// → 201, status="menunggu", penyumbang_id = token
```
`tipe`: `foto|tips|koreksi_data|spot_baru|ulasan`. `target_tipe`: `destinasi|layanan|umkm|paket_wisata|desa` (validasi eksistensi & tenant). `foto` → sertakan `media_id`. `spot_baru` → `muatan` memuat draft usulan (nama, lokasi, deskripsi) tanpa `target_id` konkret (target = `desa`). Siapa pun berperan boleh mengirim.

`GET /desa/{slug}/kontribusi?status=&tipe=&target_tipe=&milik=saya`. Tanpa `milik=saya` → antrean kurator (butuh peran pengelola). `milik=saya` → daftar milik penyumbang lintas status.

`PATCH /desa/{slug}/kontribusi/{id}` — hanya penyumbang, hanya saat `status ∈ {menunggu, revisi}`, mengubah `muatan`/`media_id`. Tidak mengubah status.

**Transisi kontribusi** — lihat §6.2.

### 4.2 Kurasi log (audit)
`GET /desa/{slug}/kurasi/log?entitas_tipe=&entitas_id=&batas=&kursor=` → riwayat append-only transisi untuk entitas apa pun yang dikurasi (`kontribusi|paket_wisata|produk_jasa|umkm|pengajuan_kartu`). Read-only; ditulis otomatis oleh service transisi. Hanya pengelola.

---

## 5. Lencana Warga

### 5.1 Poin (ledger)
`GET /desa/{slug}/poin/saya`:
```json
{ "saldo": 340,
  "riwayat": [ { "kode_aksi": "kontribusi_disetujui", "poin": 20,
    "referensi_tipe": "kontribusi", "referensi_id": "018f...",
    "dibuat_pada": "2025-07-07T04:15:00Z" } ],
  "meta": { "kursor_berikutnya": "...", "ada_lagi": true, "batas": 20 } }
```
`saldo = SUM(poin)` per `(pengguna_id, desa_id)`. Award **hanya** dari event domain (§1 idempotensi). `aturan-poin` (referensi) di `GET /desa/{slug}/aturan-poin` → `{ kode_aksi, poin, deskripsi, aktif }` (global + lokal). Kelola aturan (aktif/nonaktif, override poin per-desa): `admin`/`perangkat_desa` — CRUD ditunda ke brief admin bila diperlukan, seed cukup untuk F1.

### 5.2 Leaderboard
`GET /desa/{slug}/leaderboard?periode=all|30h|7h&batas=20` → array `{ peringkat, pengguna{id,nama,avatar}, poin, badge_teratas }`. Agregat `transaksi_poin` per desa (materialized view opsional bila trafik tinggi — lihat tradeoff §9.3). Publik (nama+avatar saja; tanpa email).

### 5.3 Badge
`GET /desa/{slug}/badge` → katalog `{ id, kode, nama, deskripsi, ikon, tingkat, syarat }` (global+lokal, `aktif`). `GET /desa/{slug}/badge/saya` → yang dimiliki (`diperoleh_pada`). Award badge **otomatis** pasca-award poin: service mengevaluasi `badge.syarat` jsonb; bila terpenuhi & belum dimiliki → insert `badge_pengguna` (`UNIQUE(pengguna_id, badge_id)` → idempoten). Tak ada endpoint klaim manual.

---

## 6. State machine (detail transisi)

Semua via `POST .../transisi { aksi, catatan? }`. Setiap transisi kurasi menulis `kurasi_log(entitas_tipe, entitas_id, dari_status, ke_status, kurator_id, keputusan=aksi, catatan)`.

### 6.1 `paket_wisata`
```
draft ──(ajukan: agen)──► review ──(setuju: kurator)──► publikasi
  ▲                         │
  └──(minta_revisi: kurator)┘   review ──(tolak: kurator)──► ditolak
publikasi ──(arsip: pemilik/pengelola)──► arsip
```
`ajukan` hanya oleh pemilik agen; `setuju|tolak|minta_revisi` hanya kurator. `setuju` → paket muncul di Pasar Desa & discovery. **Catatan `arsip`:** `arsip` bukan keputusan kurasi (tak ada di enum `kurasi_log.keputusan`). Rekomendasi: perlakukan `arsip` sebagai transisi lifecycle owner **tanpa** menulis `kurasi_log` (log hanya untuk keputusan kurator). Alternatif — memperluas enum keputusan — ditolak agar ERD tetap terkunci. Keputusan ini dicatat sebagai micro-ADR di §9.5.

### 6.2 `kontribusi`
```
menunggu ──(setuju: kurator)──► disetujui   → award poin + terapkan ke target
menunggu ──(tolak: kurator)──► ditolak
menunggu ──(minta_revisi: kurator)──► revisi ──(ajukan: penyumbang)──► menunggu
```
`ajukan` di sini = "kirim ulang" (`revisi→menunggu`) oleh penyumbang setelah `PATCH` muatan. **Efek `setuju`:** (a) tulis `transaksi_poin` idempoten `kode_aksi="kontribusi_disetujui"`, `referensi=(kontribusi, id)` → evaluasi badge; (b) *terapkan ke target*. Cakupan penerapan otomatis di F1 sengaja konservatif: `foto` → media di-lampirkan ke target; `ulasan`/`tips` → tersimpan & tersurfacing pada detail target; `koreksi_data`/`spot_baru` → **tidak** langsung memutasi `destinasi` (perubahan struktural tetap aksi pengelola) — approval menandai kontribusi `disetujui` + memunculkannya sebagai saran ber-satu-klik "terapkan" di panel kelola. Alasan: mencegah crowdsource menulis langsung ke basis data destinasi tanpa review kedua. (Tradeoff §9.6.)

### 6.3 `pengajuan_kartu`
```
menunggu ──(setuju: validator)──► tervalidasi   → hitung ulang sertifikasi_owner
menunggu ──(tolak: validator)──► ditolak
menunggu ──(minta_revisi: validator)──► revisi ──(ajukan: owner)──► menunggu
```
`aksi:"setuju"` disurface sebagai "Validasi". **Efek `setuju`:** hitung `skor = Σ bobot kartu tervalidasi` untuk `(subjek_tipe, subjek_id)` → tentukan `tingkat` via ambang konfigurable → **upsert** `sertifikasi_owner` (`UNIQUE(desa_id, subjek_tipe, subjek_id)`). Recompute berjalan dalam satu transaksi (single-writer) agar `skor`/`tingkat` konsisten.

---

## 7. Naik Kelas Lestari (seed owner)

### 7.1 Kartu aksi
`GET /desa/{slug}/kartu-aksi` → katalog kartu (template global `desa_id=null` + kustom lokal, `aktif`), tiap item: `{ id, kode, nama, deskripsi, kenapa_penting, bukti_dibutuhkan, bobot }`. `kenapa_penting` = modul edukasi singkat (owner belajar dulu). `bukti_dibutuhkan` jsonb mis. `{ "foto": true, "dokumen": false, "pernyataan": true }`.

### 7.2 Pengajuan kartu
`POST /desa/{slug}/pengajuan-kartu`:
```json
{ "subjek_tipe": "umkm", "subjek_id": "018f...", "kartu_id": 5,
  "bukti": { "foto_media_id": "018f...", "pernyataan": "Kami memilah sampah sejak..." } }
// → 201, status="menunggu"
```
`subjek_tipe`: `umkm|agen|pokdarwis`; `subjek_id` → `umkm.id` (untuk umkm) atau `pengguna.id`. Pemohon wajib pemilik/anggota subjek. `bukti` harus memenuhi bentuk `kartu.bukti_dibutuhkan` (validasi service → `422` bila kurang).

`GET .../pengajuan-kartu?status=&subjek_tipe=&subjek_id=&milik=saya`. `PATCH .../{id}` revisi `bukti` (owner, saat `revisi`). **Transisi** — §6.3.

### 7.3 Sertifikasi owner
`GET /desa/{slug}/sertifikasi?subjek_tipe=umkm&subjek_id=018f...` → `{ tingkat, skor, diperbarui_pada }`. `tingkat`: `tunas|bahari|lumba_lumba`. Juga di-embed pada DTO UMKM detail (§8) agar frontend Pasar Desa tak perlu round-trip terpisah.

**Boost ranking Pasar Desa.** Urutan default `GET /umkm` & `GET /produk` = fungsi (`sertifikasi.tingkat` desc, rating, kebaruan). `tingkat` disimpan (denormalized) agar sort murah. Ambang tingkat konfigurable (mis. Tunas ≥ s1; Bahari ≥ s2 + kartu wajib tertentu; Lumba-Lumba ≥ s3).

---

## 8. Skema objek (DTO ringkas)

Nama field ikut ERD. Field sensitif tak pernah keluar.

**BidangUsaha:** `id, kode, nama, ikon`.
**Umkm (ringkas):** `id, nama, bidang{id,kode,nama}, status_verifikasi, lokasi{lat,lng}|null, media_utama{url,alt}|null, sertifikasi{tingkat}|null, jarak_m?`.
**Umkm (detail):** ringkas + `deskripsi, telepon, whatsapp, alamat, media[], produk_ringkas[], sertifikasi{tingkat,skor}, dibuat_pada`.
**ProdukJasa:** `id, umkm{id,nama}, nama, jenis, deskripsi, harga, satuan_harga, stok|null, status, media[]`.
**PaketWisata (ringkas):** `id, slug, nama, agen{id,nama}, durasi_jam, harga, satuan_harga, kuota_default, status, media_utama`.
**PaketWisata (detail):** ringkas + `deskripsi, item[]`.
**PaketItem:** `id, hari, urutan, judul, deskripsi, destinasi{id,nama}|null, layanan{id,nama}|null, produk_jasa{id,nama}|null, durasi_menit`.
**Kontribusi:** `id, tipe, target_tipe, target_id, muatan, media{url,alt}|null, status, penyumbang{id,nama}, dibuat_pada`.
**KurasiLog:** `id, entitas_tipe, entitas_id, dari_status, ke_status, keputusan, kurator{id,nama}, catatan, dibuat_pada`.
**TransaksiPoin:** `kode_aksi, poin, referensi_tipe, referensi_id, dibuat_pada`.
**Badge:** `id, kode, nama, deskripsi, ikon, tingkat, syarat`.
**KartuAksi:** `id, kode, nama, deskripsi, kenapa_penting, bukti_dibutuhkan, bobot`.
**PengajuanKartu:** `id, subjek_tipe, subjek_id, kartu{id,nama}, bukti, status, validator{id,nama}|null, catatan, dibuat_pada, divalidasi_pada`.
**SertifikasiOwner:** `subjek_tipe, subjek_id, tingkat, skor, diperbarui_pada`.

Geo `lokasi` = `{lat,lng}` (backend `ST_SetSRID(ST_MakePoint(lng,lat),4326)`), sama seperti F0.

---

## 9. Tradeoff arsitektur (jujur)

1. **`aksi` transisi seragam vs endpoint verba per-entitas.** Dipilih satu bentuk `/transisi {aksi}` dengan kosakata = `kurasi_log.keputusan`. Untung: log audit seragam, guard terpusat, frontend satu komponen. Biaya: satu enum `aksi` menanggung tiga mesin status → validasi transisi harus tabel per-entitas di service.
2. **Polimorfik tanpa FK keras (`target`/`subjek`/`entitas`).** Dipilih demi fleksibilitas lintas-entitas. Biaya: integritas & tenant-scope dijaga service, tak ada cascade; uji kebocoran wajib. Alternatif tabel-join per tipe ditolak (ledakan tabel + rigid).
3. **Leaderboard agregat on-read vs materialized view.** F1 pakai `SUM(transaksi_poin)` langsung + indeks `(desa_id, dibuat_pada)`. Biaya: agregat tiap request. MV/refresh berkala disiapkan bila jadi hotspot; slot sudah diantisipasi ERD §3.9.
4. **`sertifikasi_owner.tingkat` denormalized vs compute-on-read.** Disimpan agar sort ranking Pasar Desa murah & auditable. Biaya: harus di-recompute konsisten tiap validasi (transaksi single-writer). Sumber kebenaran tetap `pengajuan_kartu` tervalidasi + `kurasi_log`.
5. **`arsip` di luar enum keputusan.** ERD mengunci `keputusan ∈ {setuju,tolak,minta_revisi,ajukan}`, tapi §5 diagram punya transisi `arsip`. Keputusan (micro-ADR): `arsip` = lifecycle owner **tanpa** `kurasi_log`; enum tidak diperluas agar ERD tetap terkunci. Konsekuensi: audit arsip mengandalkan `diperbarui_pada` + histori aplikasi, bukan `kurasi_log`.
6. **Auto-apply kontribusi konservatif.** `koreksi_data`/`spot_baru` yang disetujui **tidak** langsung memutasi `destinasi`; jadi saran "terapkan" bagi pengelola. Untung: mencegah crowdsource menulis basis data destinasi tanpa review kedua (anti-vandalism, jaga kualitas data desa). Biaya: satu langkah manual ekstra + status "disetujui tapi belum diterapkan" perlu ditampilkan jelas.
7. **Boost ranking sertifikasi — risiko rich-get-richer (bukan teknis).** Memberi peringkat lebih tinggi ke tingkat sertifikasi bisa mengunci owner baru (Tunas) di bawah dan memperlebar ketimpangan — bertentangan dengan misi regeneratif-inklusif. Rekomendasi: campur skor tingkat dengan **kebaruan + rotasi eksposur** agar owner baru tetap terlihat, dan pantau distribusi eksposur. Ini keputusan tata kelola Pokdarwis, bukan sekadar `ORDER BY`.

---

## 10. Gerbang `pytest` (uji kontrak F1)

- **State machine:** transisi ilegal ditolak (`draft→publikasi` langsung; `disetujui→revisi`); tiap transisi kurasi menulis tepat satu `kurasi_log`; `arsip` **tidak** menulis log.
- **Poin idempoten:** menyetujui kontribusi yang sama dua kali → poin ter-award sekali (constraint `(pengguna,kode_aksi,referensi_tipe,referensi_id)`).
- **Badge:** ter-award saat `syarat` terpenuhi, tak berganda (`UNIQUE(pengguna,badge)`).
- **Verifikasi UMKM:** UMKM `menunggu`/`ditolak` gagal (`422`) mem-`publikasi` produk; setelah `terverifikasi` berhasil.
- **Naik Kelas Lestari:** `pengajuan_kartu→setuju` menaikkan `skor` & upsert `tingkat` sesuai ambang; ranking `GET /umkm` terurut `tingkat` desc.
- **Kepemilikan:** agen A gagal (`403`) mengubah paket agen B; pemilik UMKM gagal (`403`) mengedit UMKM lain; pengelola lolos.
- **Isolasi tenant:** semua query domain terfilter `desa_id`; target/subjek/referensi lintas-desa → `404`; polimorfik tak bocor lintas-tenant.
- **`paket_item`:** item tanpa referensi maupun `judul` ditolak `422`; referensi ke entitas desa lain ditolak `404`.
- **Bukti kartu:** pengajuan dengan `bukti` tak memenuhi `bukti_dibutuhkan` ditolak `422`.
- **Publik vs kelola:** endpoint publik hanya `publikasi`/`terverifikasi` & non-soft-deleted; soft-delete UMKM menyembunyikan produknya.
- **Paginasi keyset:** stabil saat baris ditambah di tengah iterasi (poin/leaderboard/list).

---

## 11. Batas F1 (kontrak yang sengaja ditunda)

- **F2 (Dermaga + Pemandu + wisatawan Misi):** `paket_jadwal` (kuota per-tanggal), `booking`, `transaksi` (+hook reinvestment/escrow), `pemandu/*` (AI), Misi sisi wisatawan (`misi`, `paspor_lestari`, `stempel`, `stasiun_lestari`, `verifikasi` QR).
- **F3 (Analitik + Regeneratif):** `monitoring_ekologi`, `daya_dukung`, `dana_konservasi`, `neraca_regeneratif`; verifikasi berbukti (QR/monitoring) **menggantikan** validasi manual `pengajuan_kartu`.
- **F4 (Kemandirian):** provisioning & tema per-desa, RLS per-desa dinyalakan (set `app.desa_id` sudah disiapkan F0 §1).

Seluruh endpoint F1 sudah ber-slug/tenant sejak awal → penambahan modul lanjut = tambah resource, bukan refactor kontrak.

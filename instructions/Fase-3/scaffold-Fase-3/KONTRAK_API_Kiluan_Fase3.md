# Kontrak API Fase 3 — Kiluan

**Cakupan:** **Jejak Lestari** (regeneratif: `indikator_ekologi`, `monitoring_ekologi` + sinkron offline, `daya_dukung`, `pemakaian_kapasitas`, ledger `dana_konservasi`, `neraca_regeneratif`) · **Anjungan Data** (analitik: outbox `peristiwa`, medallion `job_analitik`, gold `agregat_harian`, `laporan_bulanan`).
**Diturunkan dari:** `ERD_Kiluan_Fase3.md`. Nama field snake_case Bahasa Indonesia persis seperti ERD.
**Mewarisi:** seluruh konvensi `KONTRAK_API_Kiluan_Fase0.md` §1 (base path `/desa/{slug}`, auth JWT, isolasi tenant, keyset pagination UUIDv7, amplop `galat`, soft delete, rate-limit), `Fase1.md` §1 (transisi seragam `/transisi {aksi}`, cek kepemilikan, polimorfik tanpa FK keras), `Fase2.md` §1 (header `Idempotency-Key` untuk mutasi uang, verifikasi generik + geofence, webhook di luar path tenant). Dokumen ini hanya menambah yang **baru**.
**Status:** kandidat **ADR-07**. Kunci sebelum scaffold + `pytest` F3.

> **Realita PkM (guardrail).** Sesuai peta fase, F3 sebagian besar adalah artefak **roadmap Tahun 4–5**. Irisan yang realistis menyala lebih awal: **ledger `dana_konservasi` + halaman transparansi publik**, dan **`monitoring_ekologi`** (pengumpulan data baseline ekologi Tahun 1–2 sudah lewat tabel ini per ERD §3). Sisanya — medallion otomatis, DuckDB ad-hoc, neraca terjadwal, PDF laporan, hook blokir-booking — dirancang penuh, dinyalakan bertahap. Kontrak dirancang utuh; aktivasi bertahap seperti pola "tenant sejak F0".

---

## 1. Tambahan konvensi (di atas F0/F1/F2 §1)

**Nilai turunan bukan verba klien.** Seperti "status uang" di F2, **`agregat_harian`, `pemakaian_kapasitas`, dan `neraca_regeneratif` tak pernah ditulis lewat endpoint tulis publik** — hanya dihasilkan job (medallion / hitung kapasitas / hitung neraca). API atasnya **read-only**. Tak ada jalan menyuntik skor atau agregat dari klien. Ini fondasi anti-greenwashing di level kontrak.

**Outbox internal, bukan endpoint.** `peristiwa` ditulis service domain **dalam transaksi DB yang sama** dengan perubahan domainnya (transactional outbox): `transaksi→settle`, `booking→selesai`, `stempel→terverifikasi` (F2), `monitoring→terverifikasi` (F3). **Tidak ada `POST /peristiwa`.** Kursor `diproses_pada` menjamin ETL inkremental **tepat-sekali**; job ulang tak menggandakan agregat.

**Sinkron lapangan offline (PWA).** Entri `monitoring_ekologi` lahir di lapangan tanpa sinyal. Setiap pembacaan diberi **`id` UUIDv7 oleh klien saat offline** → server melakukan **upsert idempoten atas `id`** saat `POST …/monitoring/sync`. Replay batch aman (record yang sudah ada = `duplikat`, bukan galat). Ini kunci idempotensi **alami** — berbeda dari `Idempotency-Key` header F2 (dipakai untuk mutasi uang yang tak punya kunci alami). Header `Idempotency-Key` tetap wajib untuk **outflow `dana_konservasi`** (bernilai uang).

**Transparansi publik sengaja.** Sebagian data F3 terbuka **tanpa auth** sebagai pembeda non-OTA: saldo & rincian `dana_konservasi` (termasuk foto bukti kegiatan), ringkas `neraca_regeneratif` (tiga pilar + total), dan `level` `pemakaian_kapasitas`. Subset publik **menyembunyikan** PII pencatat, nominal per-penyedia, dan hitungan kunjungan mentah. Cakupan transparansi = keputusan tata kelola (default: transparan, sejalan misi).

**Ledger append-only (warisan F2).** `dana_konservasi` **tak pernah** di-update/hapus. Koreksi = baris lawan (`jenis` berlawanan + `keterangan="koreksi …"`). Saldo = `Σ(masuk) − Σ(keluar)` per desa. Inflow `sumber_tipe=transaksi` **idempoten** via `UNIQUE(sumber_tipe, sumber_id)` → satu `transaksi` menyumbang satu inflow meski event diproses ulang.

**Parameter regeneratif tak di-hardcode (guardrail).** Bobot tiga pilar `neraca_regeneratif`, `ambang_kuning`/`ambang_merah` `daya_dukung`, dan bobot indikator adalah **input Pokdarwis**, disimpan sebagai konfigurasi — bukan konstanta kode. Nilai default = placeholder yang **wajib disepakati FGD** sebelum go-live.

**Kode error internal tambahan F3** (amplop `galat.kode`, HTTP mengikuti F0):

| `kode` internal | HTTP | Makna |
|---|---|---|
| `bukti_media_wajib` | 422 | Outflow `dana_konservasi` / monitoring `pihak_ketiga` tanpa `bukti_media_id` |
| `indikator_tidak_aktif` | 422 | Monitoring memakai indikator non-aktif / tak dikenal |
| `metrik_tidak_dikenal` | 422 | Query agregat `kode_metrik` di luar enum |
| `periode_final` | 409 | Hitung ulang / finalkan periode `neraca`/`laporan` yang sudah terkunci |
| `job_sedang_berjalan` | 409 | Trigger job lapisan yang statusnya masih `berjalan` (cegah dobel-agregat) |
| `daya_dukung_terlampaui` | 409 | *(hook F2)* Booking baru saat spot `merah` pada tanggal itu — bila blokir diaktifkan |

Diwarisi & dipakai ulang: `di_luar_geofence`, `bukti_kurang`, `transisi_ilegal`, `idempotency_key_wajib`, `validasi_gagal`.

---

## 2. Perubahan lintas-fase (hook ke F0–F2)

- **`verifikasi.entitas_tipe` (F2) diperluas → `monitoring_ekologi`.** Data warga tervalidasi lewat mekanisme QR/foto/konfirmasi yang sama. Tanpa endpoint baru: monitoring membuat baris `verifikasi`, diputus lewat `POST …/verifikasi/{id}/putuskan` (F2). Antrean difilter `?entitas_tipe=monitoring_ekologi`.
- **Inflow otomatis dana konservasi.** `transaksi→settle` (F2) menulis `dana_konservasi(jenis=masuk, sumber_tipe=transaksi, sumber_id=transaksi.id, jumlah=porsi_reinvestasi)` secara internal (idempoten per `sumber_id`). Bukan endpoint publik.
- **Hook daya dukung → checkout F2 (opsional, gated).** `POST …/checkout` (F2) boleh membaca `GET …/kapasitas/hari-ini` dan menolak booking spot `merah` pada tanggalnya → `409 daya_dukung_terlampaui`. **Default: peringatkan, jangan blokir**; blokir diaktifkan per-desa lewat tata kelola. Bacaan dari snapshot `pemakaian_kapasitas` (murah), bukan hitung live.
- **Integritas Naik Kelas Lestari menguat.** Validasi `pengajuan_kartu` (F1) yang sudah bisa menautkan `verifikasi` (F2) kini dikuatkan: bukti terverifikasi jadi syarat naik tingkat. Perubahan tata kelola + bobot, bukan bentuk endpoint.

---

## 3. Ringkasan endpoint

### Global / ops (tanpa slug) — admin/steward
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| POST | `/ops/analitik/jalankan` | Trigger medallion `{lapisan, desa_id?}` (enqueue `job_analitik`) | admin |
| GET | `/ops/analitik/job` | Daftar run `?lapisan=&status=&desa_id=` (observabilitas) | admin/steward |
| GET | `/ops/analitik/job/{id}` | Detail run (baris masuk/keluar, galat) | admin/steward |

### Jejak Lestari — indikator & monitoring · `/desa/{slug}`
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| GET | `/desa/{slug}/indikator` | Daftar (template global + kustom desa, `aktif`) | pengelola/pencatat |
| POST | `/desa/{slug}/indikator` | Buat indikator kustom desa | pokdarwis/perangkat/admin |
| PATCH | `/desa/{slug}/indikator/{id}` | Ubah / nonaktif | pokdarwis/perangkat/admin |
| GET | `/desa/{slug}/monitoring` | Daftar `?indikator_id=&destinasi_id=&status=&dari=&sampai=` | pencatat(diri)/pengelola |
| POST | `/desa/{slug}/monitoring` | Catat satu pembacaan → +`verifikasi` | kontributor/agen/pokdarwis/perangkat |
| POST | `/desa/{slug}/monitoring/sync` | **Batch sinkron offline** (upsert idempoten atas `id`) | pencatat |
| GET | `/desa/{slug}/monitoring/{id}` | Detail pembacaan + bukti | pencatat/pengelola |

### Jejak Lestari — daya dukung & kapasitas · `/desa/{slug}`
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| GET | `/desa/{slug}/daya-dukung` | Konfigurasi kapasitas per destinasi | pengelola |
| PUT | `/desa/{slug}/daya-dukung/{destinasi_id}` | Upsert konfig (`UNIQUE destinasi`) **[blocker FGD]** | pokdarwis/perangkat/admin |
| GET | `/desa/{slug}/kapasitas` | Snapshot `?destinasi_id=&dari=&sampai=` (level lampu) | publik*/pengelola |
| GET | `/desa/{slug}/kapasitas/hari-ini` | Status hari ini per destinasi (dibaca hook checkout F2) | publik*/pengelola |
| POST | `/desa/{slug}/kapasitas/hitung` | Trigger hitung ulang `{tanggal?}` (enqueue job) | steward/admin |

### Jejak Lestari — dana konservasi & neraca · `/desa/{slug}`
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| GET | `/desa/{slug}/dana-konservasi/saldo` | Saldo + rincian per kategori/sumber (**transparansi**) | publik |
| GET | `/desa/{slug}/dana-konservasi` | Ledger `?jenis=&kategori=&dari=&sampai=` | publik*/pengelola |
| GET | `/desa/{slug}/dana-konservasi/{id}` | Detail entri + bukti | publik*/pengelola |
| POST | `/desa/{slug}/dana-konservasi` | Catat `keluar` (bukti wajib) atau `masuk` manual (donasi/hibah) **[Idempotency-Key]** | bendahara/pokdarwis/perangkat |
| GET | `/desa/{slug}/neraca` | Daftar periode `?dari=&sampai=` (ringkas publik) | publik*/pengelola |
| GET | `/desa/{slug}/neraca/{periode}` | Detail skor + `komponen` | publik*/pengelola |
| POST | `/desa/{slug}/neraca/hitung` | Trigger hitung/ulang `{periode}` (enqueue job) | steward/admin |

### Anjungan Data — agregat & laporan · `/desa/{slug}`
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| GET | `/desa/{slug}/agregat` | Gold narrow `?kode_metrik=&dari=&sampai=&dimensi=` | pengelola/owner** |
| GET | `/desa/{slug}/agregat/ringkas` | Bundel metrik untuk beranda dashboard `?periode=` | pengelola |
| GET | `/desa/{slug}/laporan` | Daftar `?periode=&status=` | pengelola |
| GET | `/desa/{slug}/laporan/{periode}` | Detail ringkasan + `file` PDF | pengelola |
| POST | `/desa/{slug}/laporan` | Generate draf `{periode}` | perangkat/steward/admin |
| POST | `/desa/{slug}/laporan/{id}/transisi` | `finalkan` (draf→final) → snapshot + PDF | perangkat/steward/admin |

\* *publik hanya melihat subset transparansi (§1); PII pencatat, nominal per-penyedia, hitungan mentah disembunyikan.*
\** *owner hanya melihat irisan `booking_per_tingkat`/metrik listingnya sendiri (nudge berbasis data), bukan agregat desa penuh.*

---

## 4. Jejak Lestari — monitoring ekologi

### 4.1 Catat & sinkron
`POST /desa/{slug}/monitoring` (satu pembacaan):
```json
{ "id": "018f-clientUUIDv7", "indikator_id": 12, "destinasi_id": "018f...|null",
  "nilai": 78.5, "waktu_ukur": "2026-07-10", "metode": "survei_lapangan",
  "media_id": "018f...|null", "lokasi": { "lat": -5.75, "lng": 105.12 },
  "catatan": "transek 100m sisi timur" }
// 201 { "monitoring": { "status": "menunggu_verifikasi" }, "verifikasi": {…} }
```
`id` UUIDv7 boleh dibuat klien (offline-first) — bila kosong, server generate. Efek: validasi `indikator` **aktif** (else `422 indikator_tidak_aktif`); buat `monitoring_ekologi(status=menunggu_verifikasi)` + `verifikasi(entitas_tipe=monitoring_ekologi)` sesuai kebutuhan metode. Metode `pihak_ketiga` tanpa `media_id` → `422 bukti_media_wajib`.

`POST /desa/{slug}/monitoring/sync` (batch offline):
```json
{ "pembacaan": [ { …record… }, { …record… } ] }
// 200 { "hasil": [
//   { "id":"018f-a", "status":"tersimpan", "verifikasi_id":"018f...", "galat":null },
//   { "id":"018f-b", "status":"duplikat",  "verifikasi_id":"018f...", "galat":null },
//   { "id":"018f-c", "status":"ditolak",   "verifikasi_id":null, "galat":{ "kode":"indikator_tidak_aktif" } }
// ] }
```
**Upsert idempoten atas `id`** (record yang sudah ada = `duplikat`, tak diproses ulang). **Sukses parsial** per-record (selalu `200`), bukan all-or-nothing — batch lapangan tak boleh gagal total karena satu record cacat.

### 4.2 Verifikasi (reuse F2)
Metode otomatis diputus sinkron: geofence `ST_DWithin(lokasi, destinasi/stasiun, radius)` untuk pembacaan lokasi → gagal `422 di_luar_geofence`; `sensor` cocok token perangkat. `survei_lapangan`/`laporan_warga` → antre keputusan manual di `GET …/verifikasi?entitas_tipe=monitoring_ekologi` lalu `POST …/verifikasi/{id}/putuskan {valid|invalid}` (F2). `valid` → `monitoring.status=terverifikasi` + tulis `peristiwa(monitoring_terverifikasi)`. **Hanya `terverifikasi`** yang masuk `neraca_regeneratif` & `agregat_harian` — pintu anti-greenwashing.

---

## 5. Jejak Lestari — daya dukung, dana konservasi, neraca

### 5.1 Daya dukung & kapasitas
`PUT /desa/{slug}/daya-dukung/{destinasi_id}` upsert `{ kapasitas_harian, ambang_kuning, ambang_merah, metode_hitung }` (`UNIQUE destinasi`). **Ambang = input Pokdarwis (blocker FGD)**, tak diasumsikan sepihak.

`GET …/kapasitas/hari-ini` → per destinasi `{ destinasi, tanggal, kunjungan?, rasio, level }`. Job harian menghitung `pemakaian_kapasitas`: `kunjungan` = `booking` terkonfirmasi + check-in `stasiun_lestari` ÷ `kapasitas_harian` → `rasio` → `level` di ambang. Publik hanya melihat `level` + `rasio` (kunjungan mentah pengelola). `POST …/kapasitas/hitung` memicu hitung ulang manual (job); dua trigger lapisan yang sama tumpang tindih → `409 job_sedang_berjalan`.

### 5.2 Dana konservasi (ledger transparan)
`POST /desa/{slug}/dana-konservasi` (`Idempotency-Key`):
```json
// keluar — bukti WAJIB
{ "jenis":"keluar", "kategori":"penanaman_mangrove", "jumlah":1500000,
  "keterangan":"500 bibit + upah tanam", "tanggal":"2026-07-05",
  "bukti_media_id":"018f..." }
// masuk manual (donasi/hibah) — sumber_tipe ∈ {donasi,hibah,lainnya}
{ "jenis":"masuk", "sumber_tipe":"donasi", "jumlah":2000000, "tanggal":"2026-07-01", "keterangan":"..." }
// 201 { entri }
```
`keluar` tanpa `bukti_media_id` → `422 bukti_media_wajib` (akuntabilitas). **`sumber_tipe=transaksi` tak boleh lewat endpoint ini** — inflow itu otomatis dari settle (§2), ditolak `422 validasi_gagal`. Append-only; koreksi = baris lawan.

`GET …/dana-konservasi/saldo` (publik) → `{ saldo, total_masuk, total_keluar, per_kategori[], per_sumber[], diperbarui_pada }`. Halaman transparansi publik membaca saldo + rincian + **foto bukti** kegiatan — pembeda tajam dari OTA.

### 5.3 Neraca regeneratif
`GET …/neraca/{periode}` → `{ periode, skor_ekologi, skor_sosial, skor_ekonomi, skor_total, komponen, dibuat_pada }`. Publik melihat empat skor + ringkas `komponen`; pengelola melihat `komponen` penuh (indikator terverifikasi, distribusi `neto_penyedia` per penyedia lokal, % adopsi `sertifikasi_owner`, rasio daya dukung).

`POST …/neraca/hitung { "periode":"2026-06" }` (steward/admin) → enqueue job (`202 { job_id }`). Job **memvalidasi silang** `stempel.dampak` (mis. `{mangrove:5}`) terhadap `monitoring_ekologi` `mangrove_survival` terverifikasi; klaim tanpa dukungan monitoring **tidak** menaikkan `skor_ekologi`. Bobot tiga pilar dari konfigurasi (input Pokdarwis). Periode yang sudah terkunci → `409 periode_final`.

---

## 6. Anjungan Data — agregat, laporan, job

### 6.1 Agregat gold (dashboard)
`GET /desa/{slug}/agregat?kode_metrik=pendapatan&dari=2026-06-01&sampai=2026-06-30&dimensi=umkm_id:018f` → baris narrow `{ tanggal, kode_metrik, dimensi, nilai, diperbarui_pada }`. `kode_metrik` di luar enum → `422 metrik_tidak_dikenal`. Dashboard ECharts/Plotly membaca dari sini (cepat, ber-tenant, ber-auth); DuckDB/Parquet hanya untuk kueri ad-hoc **ops**, bukan API tenant. `GET …/agregat/ringkas?periode=` membundel metrik beranda dalam satu response.

Nudge owner: `kode_metrik=booking_per_tingkat` (korelasi `sertifikasi_owner.tingkat` ↔ booking/rating) → dashboard owner "listing Lumba-Lumba rata-rata X% lebih banyak booking".

### 6.2 Laporan bulanan
`POST …/laporan { "periode":"2026-06" }` → `laporan_bulanan(status=draf)` dengan `ringkasan` jsonb. `POST …/laporan/{id}/transisi { "aksi":"finalkan" }` → `status=final`, snapshot, render PDF ke MinIO (`file_media_id`, presigned F0). Finalkan periode `final` lagi → `422 transisi_ilegal`/`periode_final`.

### 6.3 Job & outbox (ops)
`POST /ops/analitik/jalankan { "lapisan":"gold", "desa_id":null }` (admin) → enqueue run; lapisan yang sama sedang `berjalan` → `409 job_sedang_berjalan`. `GET /ops/analitik/job` untuk observabilitas & rekonsiliasi. Alur: `peristiwa` (outbox) → **bronze** (Parquet MinIO) → **silver** (bersih+join) → **gold** → `agregat_harian` (Postgres) + `neraca_regeneratif`; tiap tahap dicatat `job_analitik`. Kursor `diproses_pada` menjamin tepat-sekali.

---

## 7. Skema objek (DTO ringkas)

Nama field ikut ERD. Sensitif tak pernah keluar ke publik: PII `pencatat`/`dicatat_oleh` (jadi peran, bukan nama), nominal `neto_penyedia` per penyedia, `kunjungan` mentah.

**Indikator:** `id, kode, nama, satuan, arah_baik, deskripsi, aktif, lingkup(template|desa)`.
**Monitoring:** `id, indikator{id,kode,nama,satuan}, destinasi{id,nama}|null, nilai, waktu_ukur, metode, pencatat{id,nama}, status, media{url}|null, catatan, dibuat_pada`.
**DayaDukung:** `destinasi{id,nama}, kapasitas_harian, ambang_kuning, ambang_merah, metode_hitung, diperbarui_pada`.
**PemakaianKapasitas (pengelola):** `destinasi{id,nama}, tanggal, kunjungan, kapasitas_harian, rasio, level, dihitung_pada`. **(publik):** `destinasi{id,nama}, tanggal, rasio, level`.
**DanaKonservasi (entri, pengelola):** `id, jenis, sumber_tipe|kategori, jumlah, keterangan, tanggal, bukti_media{url}|null, dicatat_oleh{id,nama}, dibuat_pada`. **(publik):** tanpa nama `dicatat_oleh` (peran saja), sisanya termasuk `bukti_media` tetap terlihat.
**SaldoKonservasi (publik):** `saldo, total_masuk, total_keluar, per_kategori[{kategori,jumlah}], per_sumber[{sumber_tipe,jumlah}], diperbarui_pada`.
**NeracaRegeneratif (publik):** `periode, skor_ekologi, skor_sosial, skor_ekonomi, skor_total, komponen_ringkas`. **(pengelola):** + `komponen` penuh.
**AgregatHarian:** `tanggal, kode_metrik, dimensi, nilai, diperbarui_pada`.
**LaporanBulanan:** `id, periode, ringkasan, file{url}|null, status, dibuat_pada`.
**JobAnalitik (ops):** `id, desa_id|null, lapisan, nama_job, status, baris_masuk, baris_keluar, mulai_pada, selesai_pada|null, galat|null`.

Geo `lokasi` = `{lat,lng}` (backend `ST_SetSRID(ST_MakePoint(lng,lat),4326)`), sama F0.

---

## 8. Matriks otorisasi (ringkas)

| Aksi | Publik | Wisatawan | Kontributor/Agen (pencatat) | UMKM/Owner | Bendahara/Pokdarwis/Perangkat | Steward/Admin |
|---|---|---|---|---|---|---|
| Lihat saldo/neraca ringkas/level kapasitas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Catat/sinkron `monitoring` | — | — | ✅ | — | ✅ | ✅ |
| Putuskan `verifikasi` monitoring | — | — | ✅ (agen) | — | ✅ | ✅ |
| Kelola `indikator`/`daya_dukung` | — | — | — | — | ✅ | ✅ |
| Catat outflow/masuk manual `dana_konservasi` | — | — | — | — | ✅ | ✅ |
| Lihat ledger penuh / agregat desa | — | — | — | irisan sendiri | ✅ | ✅ |
| Hitung neraca/kapasitas, jalankan job, finalkan laporan | — | — | — | — | laporan | ✅ |

Lintas-tenant selalu `404` (F0). Semua agregat & neraca terpisah per `desa_id`. Job global (`desa_id=null`) hanya admin.

---

## 9. Tradeoff arsitektur (jujur)

1. **Outbox transaksional vs baca langsung vs CDC.** Dipilih outbox `peristiwa` demi ETL inkremental bersih + tepat-sekali via kursor. Biaya: service domain wajib menulis `peristiwa` dalam transaksi yang sama (disiplin). Alternatif baca langsung tabel transaksional ditolak (batas inkremental berantakan, tepat-sekali sulit); CDC/Debezium ditolak (overkill infra untuk PkM).
2. **Gold di Postgres vs dashboard baca DuckDB langsung.** `agregat_harian` narrow di Postgres → dashboard cepat, tenant-filter & auth sederhana. Biaya: duplikasi + job sinkron. Alternatif dashboard kueri Parquet langsung ditolak (latensi + tenant-scoping/auth atas file rumit). DuckDB tetap untuk ad-hoc ops.
3. **Nilai turunan read-only (job-authoritative).** Sejajar "uang bukan verba klien" F2. Untung: satu sumber kebenaran, tak ada injeksi skor. Biaya: koreksi agregat/skor = hitung ulang job / perbaiki sumber, bukan edit langsung.
4. **Idempotensi: client-UUID (sync) vs `Idempotency-Key` (uang).** Monitoring punya kunci alami (UUIDv7 klien offline) → upsert. Outflow dana tak punya kunci alami saat retry → header. Dua gaya hidup berdampingan, sengaja & terdokumentasi.
5. **Sukses parsial pada `monitoring/sync`.** Batch selalu `200` dengan status per-record. Untung: batch lapangan tak gagal total karena satu record cacat. Biaya: klien wajib membaca hasil per-item, bukan sekadar cek HTTP.
6. **Cakupan transparansi publik.** Default membuka saldo + kategori + foto bukti + skor neraca; menyembunyikan nominal per-penyedia + PII. Biaya: tata kelola harus nyaman memperlihatkan pengeluaran. Alternatif agregat-saja lebih aman politis tapi melemahkan pembeda — jadikan tunable (default transparan).
7. **Blokir booking saat merah (hook F2).** Opsional & gated per-desa. Untung: menutup lingkar ekowisata bertanggung jawab. Biaya: mengaitkan checkout F2 ke bacaan F3 di jalur panas + sebagian Pokdarwis mungkin lebih suka *peringatkan* daripada *blokir*. Default **peringatkan**; blokir opt-in. Baca snapshot (murah), bukan hitung live.
8. **Anti-greenwashing = skor konservatif di awal.** Neraca butuh data monitoring terverifikasi; baseline Tahun 1–2 masih tipis → `skor_ekologi` rendah/konservatif. Ini disengaja: skor jujur rendah lebih baik daripada klaim inflasi. Bobot & ambang = keputusan FGD, bukan hardcode.
9. **DuckDB/Parquet bukan API tenant di F3.** Kueri ad-hoc = alat analis ops. Ekspor/kepemilikan data per-desa (query API) ditunda ke F4 (Nusantara).

---

## 10. Gerbang `pytest` (uji kontrak F3)

- **Rekonsiliasi gold:** `agregat_harian` == sumber transaksional (`transaksi`/`booking`) untuk metrik & periode uji.
- **Saldo konservasi:** `saldo = Σ(masuk) − Σ(keluar)`; inflow `sumber=transaksi` = `Σ transaksi.porsi_reinvestasi`; event settle diproses ulang tak menggandakan inflow (`UNIQUE(sumber_tipe, sumber_id)`).
- **Outflow tanpa bukti:** `jenis=keluar` tanpa `bukti_media_id` → `422 bukti_media_wajib`; `sumber_tipe=transaksi` lewat endpoint → `422 validasi_gagal`.
- **Ambang kapasitas:** `level` memicu tepat di ambang kuning/merah; publik tak melihat `kunjungan` mentah.
- **(Opsional) blokir booking:** saat spot `merah` tanggal itu & blokir aktif → checkout `409 daya_dukung_terlampaui`; saat blokir mati → tetap `201` (peringatan saja).
- **Hanya terverifikasi masuk skor:** monitoring `menunggu_verifikasi`/`ditolak` tak masuk `neraca_regeneratif` & `agregat_harian`.
- **Anti-greenwashing:** `stempel.dampak` tanpa dukungan `monitoring` terverifikasi tak menaikkan `skor_ekologi`.
- **Outbox tepat-sekali:** kursor `diproses_pada` idempoten; job ulang tak menggandakan agregat.
- **Verifikasi monitoring:** di luar geofence → `422 di_luar_geofence`; bukti kurang → `422 bukti_kurang`.
- **Sinkron offline idempoten:** record `id` sama di-replay → satu baris (`status=duplikat`), bukan galat.
- **Periode terkunci:** hitung/finalkan `neraca`/`laporan` yang `final` → `409 periode_final`.
- **Job konkuren:** trigger lapisan yang sedang `berjalan` → `409 job_sedang_berjalan`.
- **Isolasi tenant:** semua agregat, neraca, ledger, monitoring desa A tak terlihat desa B (`404`); job global hanya admin.
- **Paginasi keyset:** stabil saat baris ditambah di tengah iterasi (monitoring/ledger/agregat/neraca).

---

## 11. Batas F3 & blocker

**Blocker non-teknis (guardrail, wajib FGD sebelum go-live):** bobot tiga pilar `neraca_regeneratif`, `ambang_kuning`/`ambang_merah` `daya_dukung`, kategori & tata kelola pengeluaran `dana_konservasi`, cakupan transparansi publik, dan kebijakan *blokir vs peringatkan* saat merah. Endpoint ada; nilai default tak boleh diasumsikan sepihak. Menyatu dengan blocker FGD F2 (`persen_reinvestasi`).

**Sengaja ditunda ke F4 (Nusantara):** ekspor/kepemilikan data per-desa (termasuk query API atas gold/DuckDB), provisioning tenant & tema/white-label, marketplace lintas-desa. Semua tabel F3 sudah ber-`desa_id` → per-tenant otomatis, penambahan = resource baru, bukan refactor kontrak.

**Irisan tipis PkM yang realistis dinyalakan awal:** ledger `dana_konservasi` + transparansi publik, `monitoring_ekologi` (baseline Tahun 1–2) + verifikasi, dashboard gold minimal (beberapa `kode_metrik`), neraca dasar. Medallion otomatis penuh, DuckDB ad-hoc, PDF laporan terjadwal, hook blokir-booking → dirancang sekarang, dinyalakan Tahun 4–5.

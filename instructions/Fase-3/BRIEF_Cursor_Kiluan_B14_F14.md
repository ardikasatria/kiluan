# Brief Cursor — B14/F14 Kiluan (Jejak Lestari inti)

**Untuk:** agen Cursor (backend + frontend berpasangan).
**Prasyarat:** F0–F2 tuntas & hijau. Stack **async** (ADR-0003). B14 adalah **brief F3 pertama** → membawa migrasi F3.
**Rujukan wajib (`docs/` / Project Knowledge):** `BLUEPRINT_Platform_Desa_Wisata_Regeneratif.md`, `ERD_Kiluan_Fase3.md`, `KONTRAK_API_Kiluan_Fase3.md`, dan **scaffold F3** `scaffold_f3/` (domain `app/` — enums + errors + util + model + repo memori + `layanan_monitoring.py`/`layanan_dana.py`, bagian dari **33 pytest hijau**).
**Cakupan B14/F14:** `monitoring_ekologi` (+ sinkron offline PWA), `dana_konservasi` (ledger transparan + inflow otomatis), halaman **transparansi publik** dana konservasi, dan perluasan `verifikasi` (F2) untuk `monitoring_ekologi`.
**Prinsip:** blueprint-first, multi-tenant per-`desa_id`, enum di aplikasi **+ CHECK**, snake_case Bahasa Indonesia, **tak ada perubahan skema tanpa Alembic**, lintas-tenant → **404 bukan 403**, ledger **append-only**.

> **Cara pakai.** B14 (backend) & F14 (frontend) satu nomor boleh paralel: frontend memakai mock kontrak sampai backend siap. Pasangan **WAJIB** dibuka dengan **Langkah 0**. Jangan lompat ke B15/B16 sebelum gerbang B14 hijau.

---

## Langkah 0 — Orientasi repo (template, tempel di awal SETIAP brief)

Sebelum menyentuh kode, agen:
1. Membaca `docs/ERD_Kiluan_Fase3.md` §1a/§3 (Jejak Lestari), §2 (perubahan lintas-fase), §4 (enum), §5 (state machine monitoring) + `docs/KONTRAK_API_Kiluan_Fase3.md` §1/§3/§4/§5.2, dan scaffold `app/layanan_monitoring.py` + `app/layanan_dana.py` yang akan diwujudkan.
2. Memetakan repo pasca-F2: `backend/app/{domain,skema,layanan,repo,model,api,inti}`, `frontend/app`, `infra/`. Catat file **disentuh** vs **rujukan**. Pola acuan tetap: `app/repo/sql.py` (mapping ORM↔domain), `app/api/deps.py` (`resolusi_desa`/`wajib_peran`), `app/inti/*` (adapter geo/media/outbox ber-gate).
3. Konvensi wajib: filter `desa_id` di **semua** query; amplop error `{"galat":{"kode","pesan","rincian"}}`; lintas-tenant→404; keyset `?batas=&kursor=`; kepemilikan (pencatat hanya monitoring miliknya, pengelola melewati); **`Idempotency-Key`** wajib untuk `POST /dana-konservasi` (mutasi uang).
4. `cd backend && pytest -q` harus **hijau** (F0+F1+F2 terport). Jangan pecahkan.
5. **Jangan** ubah `app/domain/**` & `app/skema/**` F0–F2 kecuali brief memerintah eksplisit (di sini: **perluas CHECK `verifikasi.entitas_tipe`** + **hook inflow di jalur settle F2** — keduanya diizinkan eksplisit, lihat §Keputusan). Perubahan perilaku lain lewat `layanan/`+`repo/`+`api/`.
6. Setiap perubahan skema = **migrasi Alembic increment** di atas revisi F2 (`0003_f2`). Uji `upgrade head` → `downgrade` ke revisi F2 bersih.

Keluaran Langkah 0: ringkasan 5–10 baris (file dibuat/diubah + risiko) sebelum ngoding.

---

## Keputusan yang harus dikunci SEBELUM B14 (jangan diam-diam diputuskan agen)

1. **Migrasi F3 front-loaded (rekomendasi: YA).** Satu migrasi increment `0004_f3` di B14 membuat **seluruh 10 tabel F3 sekaligus** (`indikator_ekologi, monitoring_ekologi, daya_dukung, pemakaian_kapasitas, dana_konservasi, neraca_regeneratif, peristiwa, job_analitik, agregat_harian, laporan_bulanan`) + ALTER CHECK `verifikasi.entitas_tipe`, agar **B15/B16 tak menyentuh skema**. Konsisten dgn `0002_f1`/`0003_f2`. Tradeoff: satu migrasi "gemuk" vs per-modul; dipilih karena ERD F3 dikunci sebagai satu unit → `upgrade`/`downgrade` atomik.
2. **Cara menerapkan inflow reinvestasi (rekomendasi: sinkron-di-settle sekarang, outbox-consumer nanti).** ERD §6: `transaksi→settle` menulis `dana_konservasi(masuk, jumlah=porsi_reinvestasi)`. Untuk PkM (ETL medallion B16 belum nyala), terapkan **sinkron di jalur settle F2** — idempoten via `UNIQUE(sumber_tipe, sumber_id)` → aman dipindah ke consumer outbox B16 tanpa ubah data. Konfirmasi Satria.
3. **Blocker non-teknis (guardrail).** Tata kelola `dana_konservasi` — kategori pengeluaran, siapa boleh mencatat (`bendahara/pokdarwis/perangkat`), dan **cakupan transparansi publik** — **wajib disepakati FGD** Pokdarwis. Menyatu dgn blocker `persen_reinvestasi` F2. Endpoint ada; default tak diasumsikan sepihak.
4. **Seed indikator template** (`desa_id=null`): `kesehatan_karang, populasi_lumba, tutupan_mangrove, mangrove_survival, sampah_terkumpul` (ERD §3, `arah_baik` sesuai). Pokdarwis boleh menambah indikator kustom desa lewat endpoint.

---

## Pasangan B14/F14 — Jejak Lestari inti

**Tujuan.** Pengumpulan **data ekologi lapangan** (offline-first, tervalidasi) dan **ledger dana konservasi transparan** hidup — dua pembeda regeneratif yang realistis dieksekusi dalam jendela PkM (baseline Tahun 1–2 masuk lewat `monitoring_ekologi`).

### B14 (backend)
Langkah 0, lalu:

- **Migrasi `0004_f3`** (increment di atas `0003_f2`): buat 10 tabel F3 (cocokkan `model/tabel.py`). Wajib:
  - **CHECK** tiap enum ERD §4 (bukan ENUM native).
  - **ALTER CHECK** `verifikasi.entitas_tipe` → tambah nilai `monitoring_ekologi` (perluas, jangan buat tabel baru).
  - **Indeks**: `monitoring_ekologi(desa_id, indikator_id, waktu_ukur)`, `(destinasi_id)`; `dana_konservasi(desa_id, tanggal, jenis)`.
  - **UNIQUE**: `dana_konservasi(sumber_tipe, sumber_id)` **partial WHERE sumber_tipe='transaksi'** (idempotensi inflow di DB); `indikator_ekologi(desa_id, kode)` (kode unik per desa; template `desa_id=null`).
  - **Seed** indikator template (Keputusan §4).
  - Uji `upgrade head` → `downgrade` ke `0003_f2` bersih (urutan drop/FK benar).
- **`repo/sql.py`** +`RepoIndikator/Monitoring/DanaKonservasi/Peristiwa` — **signature 1:1** dgn `scaffold_f3/app/repo.py`. Idempotensi **di DB, bukan read-then-write**:
  - Sinkron offline: `INSERT … monitoring_ekologi … ON CONFLICT (id) DO NOTHING` (id = UUIDv7 dibuat klien) → baris ada = `duplikat`.
  - Inflow: `INSERT … dana_konservasi … ON CONFLICT (sumber_tipe, sumber_id) DO NOTHING` → kembalikan `False` bila 0 baris (tak menggandakan).
- **Wujudkan `layanan_monitoring.py`** → endpoint (KONTRAK §3/§4.1–4.2):
  - `GET/POST/PATCH /desa/{slug}/indikator` (POST/PATCH: pokdarwis/perangkat/admin); indikator non-aktif → `422 indikator_tidak_aktif`.
  - `POST /desa/{slug}/monitoring` (pencatat: kontributor/agen/pokdarwis/perangkat); `pihak_ketiga` tanpa `media_id` → `422 bukti_media_wajib`. Buat `monitoring(menunggu_verifikasi)` + `verifikasi(entitas_tipe=monitoring_ekologi)`.
  - `POST /desa/{slug}/monitoring/sync` **batch**: upsert idempoten atas `id`; **sukses parsial** (selalu `200` dgn status per-record `tersimpan|duplikat|ditolak`).
  - `GET /desa/{slug}/monitoring?indikator_id=&destinasi_id=&status=&dari=&sampai=`, `GET /{id}` (kepemilikan: pencatat diri/pengelola).
  - **Verifikasi**: metode ber-geofence pakai **PostGIS `ST_DWithin`** (bukan haversine Python; scaffold cuma emulasi) thd `destinasi`/`stasiun` + `radius_m` → gagal `422 di_luar_geofence`; bukti kurang → `422 bukti_kurang`. `valid` → `monitoring=terverifikasi` + **tulis `peristiwa(monitoring_terverifikasi)`** (outbox, satu transaksi).
- **Perluas verifikasi F2** (eksplisit): `GET /desa/{slug}/verifikasi?entitas_tipe=monitoring_ekologi` (antrean) + `POST /desa/{slug}/verifikasi/{id}/putuskan {valid|invalid}` men-*dispatch* efek ke monitoring (set status + emit outbox saat valid). Endpoint F2 tak berubah bentuk; hanya menambah cabang `entitas_tipe`.
- **Wujudkan `layanan_dana.py`** → endpoint (KONTRAK §5.2):
  - `POST /desa/{slug}/dana-konservasi` **[Idempotency-Key]** (bendahara/pokdarwis/perangkat): `keluar` tanpa `bukti_media_id` → `422 bukti_media_wajib`; `sumber_tipe=transaksi` → `422 validasi_gagal` (inflow otomatis, bukan manual). Append-only.
  - `GET /desa/{slug}/dana-konservasi/saldo` **(publik)** → `{saldo, total_masuk, total_keluar, per_kategori[], per_sumber[], diperbarui_pada}`.
  - `GET /desa/{slug}/dana-konservasi?jenis=&kategori=&dari=&sampai=` (publik subset: tanpa nama `dicatat_oleh`; pengelola penuh) + `GET /{id}` (dgn `bukti_media.url`).
- **Hook inflow di settle F2** (Keputusan §2): pada `pembayaran→berhasil`/split escrow, panggil `dana.inflow_dari_transaksi(trx)` **dalam transaksi yang sama** (idempoten `ON CONFLICT`). Emit juga `peristiwa(transaksi_settle)` untuk B16.
- **Tes:** unit `test_monitoring`/`test_dana` port dari scaffold tetap hijau; **integrasi Postgres/PostGIS** uji: sinkron `id` sama → satu baris (uji constraint, bukan hanya Python); inflow settle dua kali → satu inflow (uji `UNIQUE` partial); `saldo=Σmasuk−Σkeluar`; outflow tanpa bukti `422`; geofence `ST_DWithin` menolak di luar radius; hanya monitoring `terverifikasi` menulis `peristiwa`; isolasi `desa_id` (ledger/monitoring desa A tak terlihat B → 404).

### F14 (frontend)
Langkah 0, lalu:

- **Entri monitoring lapangan (PWA offline-first)** `/[desa]/lestari/monitoring/catat`: pilih indikator, isi `nilai`+`satuan`, `waktu_ukur`, `metode`, tangkap **lokasi GPS** + foto (uploader presigned F0). Simpan ke **IndexedDB** dgn **`id` UUIDv7 dibuat klien**; service worker **sinkron tertunda** → `POST …/monitoring/sync` saat online. Tampilkan status antrean (belum terkirim/tersimpan/duplikat/ditolak).
- **Daftar monitoring saya** (`milik=saya`) lintas status; badge `menunggu_verifikasi/terverifikasi/ditolak`.
- **Antrean verifikasi** (verifikator: agen/pokdarwis/perangkat) `?entitas_tipe=monitoring_ekologi`: peta titik + foto + jarak dari stasiun; aksi `valid/invalid` + catatan.
- **Halaman transparansi publik** `/[desa]/lestari/dana` (tanpa login): kartu **saldo** + rincian `per_kategori`/`per_sumber`, timeline ledger dgn **foto bukti** tiap pengeluaran. Ini pembeda non-OTA yang sengaja terlihat.
- **Form catat dana** (bendahara/pokdarwis): `keluar` (kategori + jumlah + **bukti wajib** + keterangan) / `masuk` manual (donasi/hibah); kirim dgn `Idempotency-Key`.
- **Gerbang:** entri lapangan offline tersimpan lokal & tersinkron saat online (replay tak menggandakan); monitoring terverifikasi berpindah status; halaman transparansi menampilkan saldo + bukti tanpa login; pengeluaran tanpa bukti ditolak (UI + backend sepakat); tak ada PII pencatat di halaman publik.

**Batas B14:** `neraca_regeneratif`, `daya_dukung`/`pemakaian_kapasitas` (+ hook blokir booking), dan validasi silang `stempel.dampak` ↔ monitoring → **B15**. Medallion (outbox→bronze/silver/gold), `agregat_harian`, dashboard ECharts, laporan PDF → **B16**. Di B14, outbox hanya **ditulis** (`monitoring_terverifikasi`, `transaksi_settle`), belum dikonsumsi.

---

## Penutup B14 & langkah selanjutnya

```
B14/F14 (Jejak Lestari inti)  ──►  B15/F15 (daya dukung + neraca)  ──►  B16/F16 (Anjungan Data / medallion)
   monitoring offline                 pemakaian + hook F2                outbox→gold + dashboard + laporan
   ledger + transparansi              neraca + anti-greenwashing
```

1. **Kunci keputusan §1–§4** sebelum ngoding; simpan sebagai **ADR** pendek di `docs/adr/` (migrasi F3 front-loaded, idempotensi via `ON CONFLICT`, inflow sinkron-di-settle). Ini kandidat **ADR-07** (kontrak) + **ADR-08** (inflow & outbox F3).
2. **Hijaukan gerbang B14** (subset KONTRAK §10: sinkron idempoten, inflow idempoten, saldo, outflow bukti, geofence, isolasi tenant) sebelum B15.
3. **Blocker paralel:** FGD tata kelola dana konservasi (kategori + transparansi) dgn Pokdarwis — sama forum dgn `persen_reinvestasi` F2. Tanpa ini, endpoint hidup tapi **jangan go-live** dgn nilai default.
4. Seluruh endpoint B14 sudah ber-slug/tenant & ber-`desa_id` → penambahan B15/B16 = tambah resource, bukan refactor.

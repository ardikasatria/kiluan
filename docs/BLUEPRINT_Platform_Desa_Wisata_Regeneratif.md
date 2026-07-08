# BLUEPRINT RANCANGAN — Kiluan (Platform Desa Wisata Regeneratif)

**Nama platform:** **Kiluan** — platform desa wisata regeneratif berbasis komunitas.
**Domain:** `kiluan.sainsdataciv.com`
**Pemilik proyek:** **sainsdataciv** — Kelompok Keilmuan *Computational Intelligence and Vision (CIV)*, Program Studi Sains Data, ITERA.
**Codename/engine:** `Kiluan` — mesinnya dapat direplikasi ke desa lain di Fase 4 (lihat modul Nusantara); instans perdana adalah Teluk Kiluan.
**Instans flagship:** Desa Wisata Teluk Kiluan, Kelumbayan, Tanggamus, Lampung.
**Stack inti:** FastAPI (backend) · Next.js App Router (frontend, PWA) · PostgreSQL + PostGIS · Redis · MinIO · DuckDB (analitik) · Docker Compose.

---

## 0. Positioning: kenapa ini BUKAN Traveloka

Ini bagian terpenting, karena menentukan seluruh model data dan alur nilai. Traveloka = **OTA ekstraktif**: agregator inventori, ambil komisi, data & margin lari ke pusat. PDW = **platform data wisata milik komunitas yang regeneratif**. Tiga pembeda struktural yang harus terlihat sampai ke level tabel database:

| Dimensi | Traveloka / OTA | PDW (regeneratif, community-owned) |
|---|---|---|
| Kepemilikan data | Milik platform | Milik desa/Pokdarwis; platform hanya penatalayan (steward) |
| Aliran nilai | Komisi ke pusat | Transaksi langsung penyedia lokal + *reinvestment loop* ke dana konservasi |
| Inventori | Di-supply korporat/hotel chain | *Community-powered* (crowdsourced, dikurasi, ada gamifikasi kontribusi) |
| Sukses = | GMV & take-rate | GMV **+ Neraca Regeneratif** (daya dukung, ekologi, distribusi pendapatan) |
| Konten | Generik, SEO | Kekhasan lokal + validasi ekologis |

**Prinsip regeneratif** (yang jadi *first-class citizen*, bukan tempelan CSR): setiap perjalanan idealnya meninggalkan destinasi lebih baik daripada sebelumnya. Diterjemahkan jadi tiga mekanisme teknis yang dibangun sejak awal skema data: (1) **pemantauan daya dukung** (carrying capacity) per spot; (2) **reinvestment loop** — porsi transaksi otomatis mengalir ke dana konservasi desa; (3) **Neraca Regeneratif** — ledger dampak ekologi-sosial-ekonomi yang jadi KPI setara GMV.

---

## 1. Prinsip Desain (diwarisi dari PSD)

1. **Blueprint-first.** Skema data, kontrak API, dan user-flow dikunci sebelum baris kode pertama.
2. **Modular per "Ruang".** Tiap modul punya batas jelas (bounded context), bisa dikembangkan/di-test terpisah.
3. **Community-powered data.** Data destinasi/UMKM/paket berasal dari komunitas; kualitas dijaga lewat kurasi + gamifikasi.
4. **Offline-first (PWA).** Infrastruktur telekomunikasi Teluk Kiluan terbatas → Next.js PWA + service worker, mode baca offline, sinkronisasi tertunda untuk entri data lapangan.
5. **Regeneratif-by-design.** Metrik daya dukung & dampak tertanam di domain model, bukan ditambahkan belakangan.
6. **Verifikasi berlapis.** Scaffold Python murni → `pytest` hijau → baru brief Cursor (backend+frontend berpasangan), setiap brief dibuka **"Langkah 0 — Orientasi repo"**.

---

## 2. Arsitektur Sistem

### 2.1 Layanan (Docker Compose)

```
pdw/
├── backend/            # FastAPI (async), SQLAlchemy 2.x, Alembic, Pydantic v2
├── frontend/           # Next.js (App Router), TypeScript, Tailwind, PWA
├── analytics/          # DuckDB + job Parquet (medallion), dipanggil backend
├── infra/
│   ├── docker-compose.yml
│   ├── postgres/       # + ekstensi PostGIS
│   ├── redis/          # cache, rate-limit, job queue ringan
│   ├── minio/          # media (foto/video destinasi & UMKM), Parquet analitik
│   └── nginx/          # reverse proxy, TLS
└── docs/               # blueprint, ADR, brief Cursor
```

Keputusan sadar: **Gitea & JupyterHub tidak dibawa** dari stack PSD. PSD butuh repo hosting + notebook untuk talenta data; PDW tidak — beban operasional dua service itu tak sepadan untuk desa wisata. **DuckDB dipertahankan** karena pola medallion (bronze→silver→gold Parquet di MinIO) sudah terbukti di Pabrik Data PSD dan cocok untuk analitik kunjungan tanpa data warehouse mahal.

### 2.2 Aliran data ringkas

```
Wisatawan/UMKM/Pokdarwis
        │  (Next.js PWA)
        ▼
   FastAPI  ──►  Postgres/PostGIS  (transaksional: profil, paket, booking, poin)
     │  │
     │  └────►  MinIO             (media + Parquet)
     │
     └──► Redis (cache/queue) ──► job ETL ──► DuckDB medallion ──► Anjungan Data (dashboard)
```

---

## 3. Aktor / Peran (Multi-role Membership)

Diperluas dari proposal ("kolaborasi umum, organisasi, perangkat desa"):

| Peran | Deskripsi | Kapabilitas inti |
|---|---|---|
| **Wisatawan** | Publik | Cari, rencana, booking, review, kontribusi (foto/tips) |
| **Pokdarwis** | Pengelola desa wisata | Kelola destinasi, kurasi konten, lihat dashboard, kelola dana konservasi |
| **UMKM** | Pelaku usaha lokal | Daftar produk/jasa, kelola pesanan, lihat performa |
| **Agen Lokal** | Penyusun paket | Buat & publikasikan paket wisata, kelola kuota/jadwal |
| **Kontributor Umum** | Relawan data | Sumbang data/foto, dapat badge & poin (gamifikasi) |
| **Organisasi/Mitra** | NGO, kampus, Dinas | Program konservasi, data ekologi, sponsor reinvestment |
| **Perangkat Desa** | Pemerintahan pekon | Legitimasi, tata kelola, verifikasi |
| **Admin/Steward** | Tim platform | Moderasi, konfigurasi, replikasi antar-desa |

Model izin: **RBAC** (role) + **scope per-desa** (tenant) sejak Fase 0, supaya replikasi multi-desa di Fase 4 tidak perlu refactor besar.

---

## 4. Peta Modul ("Ruang") → Fase

Nama fungsional = utama; label tematik = branding opsional (metafora "menjelajahi desa digital").

| Modul (fungsional) | Label tematik | Ringkas | Fase |
|---|---|---|---|
| Etalase & Discovery | **Gerbang** | Katalog destinasi, cari, profil spot, PWA publik | **F0** |
| Identitas & Keanggotaan | **Balai Warga** | Auth, RBAC, profil multi-peran, per-desa tenant | **F0** |
| Basis Data Destinasi | **Destinasi Kiluan** | Structured tourism data: spot, layanan, kalender, geo | **F0** |
| Kolaborasi Ekosistem | **Pasar Desa** | UMKM daftar produk/jasa, agen input paket, crowdsourcing | **F1** |
| Kurasi Konten & Paket | **Dapur Konten** | Review→publish paket/konten (mirip Ruang Transformer PSD) | **F1** |
| Gamifikasi Kontribusi | **Lencana Warga** | Badge 3-tingkat, poin, leaderboard kontributor | **F1** |
| Pemandu Cerdas | **Pemandu** | AI Tourism Assistant: itinerary, estimasi anggaran, chatbot | **F2** |
| Pemesanan & Transaksi | **Dermaga** | Booking, jadwal, pembayaran, transaksi langsung | **F2** |
| Analitik Destinasi | **Anjungan Data** | Dashboard tren kunjungan & performa UMKM (DuckDB) | **F3** |
| Neraca Regeneratif | **Jejak Lestari** | Daya dukung, dana konservasi, ledger dampak ekologi-sosial | **F3** |
| **Misi Regeneratif (UNGGULAN)** | **Misi Kiluan** | Quest wisatawan (*Penjelajah Lestari*) + sertifikasi owner (*Naik Kelas Lestari*) + loop data ekologi | **F1→F3** |
| Kemandirian & Replikasi | **Nusantara** | Multi-tenant white-label, onboarding desa baru, tata kelola | **F4** |

---

## 5. ROADMAP FASE 0 → FASE 4

Tiap fase memakai pola PSD: **Tujuan → Modul → Entitas data → Permukaan API → Rute frontend → Gerbang `pytest` → Inventaris brief (backend+frontend berpasangan)**.

> **Realitas PkM 8 bulan (Rp20jt):** yang tuntas & bisa diklaim sebagai luaran wajib = **Fase 0 + Fase 1** (platform aktif, keanggotaan, kolaborasi UMKM/paket, gamifikasi) plus **thin slice Fase 2** (AI Tourism Assistant versi rule-based sebagai demo "fitur unggulan"). Fase 2 penuh, Fase 3, Fase 4 = roadmap Tahun 4–5. Ini jujur dan tetap memenuhi semua indikator di Tabel 2 & Tabel 3 proposal.

---

### FASE 0 — Fondasi & Etalase
*Peta ke roadmap Tahun 3 (fondasi digital & literasi). PkM bulan 1–4.*

**Tujuan.** Platform hidup, publik bisa akses, ada katalog destinasi terstruktur, auth multi-peran & tenant per-desa. Ini "platform aktif dapat diakses publik" (Solusi 1).

**Modul:** Gerbang, Balai Warga, Destinasi Kiluan.

**Entitas data inti:**
- `desa` (tenant): id, nama, koordinat, deskripsi, status.
- `user`, `role`, `membership(user, desa, role)` — RBAC + scope.
- `destinasi` (spot): geo (PostGIS point/polygon), kategori, deskripsi, daya_dukung_harian (disiapkan untuk F3).
- `layanan`: jenis, penyedia, harga, ketersediaan.
- `media`: referensi objek MinIO, kaitan polimorfik ke destinasi/layanan.
- `kalender_aktivitas`: event/musim (mis. jadwal lumba-lumba pagi).

**API (contoh):** `GET /desa/{slug}`, `GET /destinasi?desa=&kategori=&near=`, `GET /destinasi/{id}`, `POST /auth/*`, `GET/POST /membership`.

**Frontend:** `/` (discovery multi-desa), `/[desa]` (beranda desa), `/[desa]/spot/[id]`, `/masuk`, `/daftar`, shell PWA + service worker.

**Gerbang pytest:** migrasi Alembic bersih; RBAC menolak akses lintas-tenant; geo-query radius benar; upload media → URL MinIO valid; PWA lighthouse installable.

**Inventaris brief (pasangan):**
- B0/F0 — *Bootstrap*: skema DB + Alembic, health check, layout PWA. (buka dgn **Langkah 0 — Orientasi repo**)
- B1/F1 — Auth & RBAC multi-tenant.
- B2/F2 — Ruang Metadata destinasi + geo.
- B3/F3 — Etalase/Discovery + halaman spot.
- B4/F4 — Media MinIO + galeri.

**Luaran fase:** ≥10 spot, ≥15 layanan, ≥20 profil UMKM terinput (target Solusi 1). *Catatan: entri UMKM di sini baru profil statis; transaksinya di F1–F2.*

---

### FASE 1 — Komunitas & Kolaborasi
*Peta ke roadmap Tahun 4 (partisipasi komunitas & platform kolaboratif). PkM bulan 4–8.*

**Tujuan.** Ekosistem hidup: UMKM & agen mengelola inventori sendiri, masyarakat menyumbang data, kualitas dijaga lewat kurasi + gamifikasi. Ini pembeda fundamental dari platform komersial (Solusi 3).

**Modul:** Pasar Desa, Dapur Konten, Lencana Warga.

**Entitas data:**
- `umkm` (diperkaya): kategori, kontak, status verifikasi; `produk_jasa`.
- `paket_wisata`: agen, itinerary_items, harga, kuota, status (draft→review→published).
- `kontribusi`: siapa, apa (foto/tips/koreksi data), status kurasi.
- `kurasi_log`: reviewer, keputusan, catatan (state machine, mirip Ruang Ide/Transformer PSD).
- `poin`, `badge`, `aturan_gamifikasi`: 3 tingkat badge + sistem poin.

**API:** `POST /umkm/{id}/produk`, `POST /paket` + transisi status, `POST /kontribusi`, `POST /kurasi/{id}/putuskan`, `GET /leaderboard`, `GET /badge/saya`.

**Frontend:** `/[desa]/pasar`, dashboard UMKM, editor paket agen, `/[desa]/kontribusi`, antrian kurasi Pokdarwis, halaman badge/leaderboard.

**Gerbang pytest:** state machine paket menolak transisi ilegal; poin ter-award sesuai aturan & idempoten; kurasi hanya oleh peran berwenang; kontribusi tertolak tak muncul publik.

**Inventaris brief:**
- B5/F5 — Pasar Desa (UMKM produk/jasa).
- B6/F6 — Paket wisata + state machine (agen).
- B7/F7 — Kontribusi crowdsourcing.
- B8/F8 — Dapur Konten (antrian kurasi + keputusan).
- B9/F9 — Gamifikasi (poin, badge, leaderboard).
- B9b/F9b — Seed *Naik Kelas Lestari*: kartu aksi regeneratif owner → boost ranking Pasar Desa.

**Luaran fase:** ≥30 akun aktif, ≥10 paket dipublikasi, ≥20 produk UMKM aktif, partisipasi kontributor +60% (target Solusi 2 & 3).

---

### FASE 2 — Kecerdasan & Layanan (Pemandu + Dermaga)
*Peta ke roadmap Tahun 4 (AI Tourism Assistant sebagai fitur unggulan). Thin slice di PkM, penuh di Tahun 4.*

**Tujuan.** Wisatawan dapat rekomendasi & bisa bertransaksi langsung ke penyedia lokal (memutus perantara luar).

**Modul:** Pemandu (AI), Dermaga (booking/transaksi).

**AI Tourism Assistant — arsitektur berlapis (sesuai proposal: *lightweight*, berbasis data lokal):**
1. **Rule-based recommender** (thin slice PkM): itinerary dari constraint (durasi, minat, budget, musim) atas data lokal — deterministik, mudah dipelihara.
2. **Estimasi anggaran** dari basis harga lokal (`layanan`, `paket`).
3. **Chatbot FAQ** retrieval sederhana (RAG ringan atas konten destinasi). Opsi LLM eksternal via API di-*gate* di belakang layanan sendiri agar bisa diganti/dimatikan (kendali biaya + kedaulatan data).

**Dermaga:** `booking` (paket/layanan, kuota, jadwal), pembayaran (mulai dari transfer manual + verifikasi, siapkan slot payment gateway), `transaksi` yang mencatat **porsi reinvestment** (hook untuk Jejak Lestari F3).

**API:** `POST /pemandu/itinerary`, `POST /pemandu/estimasi`, `POST /pemandu/tanya`, `POST /booking`, `POST /transaksi`.

**Frontend:** `/[desa]/rencanakan` (wizard itinerary + estimasi), widget chatbot, alur booking & konfirmasi.

**Gerbang pytest:** itinerary hormati constraint & kuota; estimasi cocok dgn harga sumber; booking tak melebihi kuota (uji balapan/race); transaksi mencatat porsi reinvestment.

**Inventaris brief:** B10/F10 Rule recommender+itinerary · B11/F11 Estimasi anggaran · B12/F12 Chatbot · B13/F13 Booking · B14/F14 Transaksi+reinvestment hook.

**Luaran (thin slice PkM):** ≥75% kepuasan atas rekomendasi (target AI), ≥30% kenaikan transaksi langsung (target Solusi 3).

---

### FASE 3 — Analitik & Regeneratif
*Peta ke roadmap Tahun 5 (analitik & insight strategis). Data baseline ekologi dari Tahun 1–2 konservasi masuk ke sini.*

**Tujuan.** Pengelolaan berbasis data + pembeda regeneratif yang nyata & terukur.

**Modul:** Anjungan Data (analitik), Jejak Lestari (Neraca Regeneratif).

**Anjungan Data (pola medallion PSD):** job ETL Redis→DuckDB: **bronze** (event mentah kunjungan/transaksi) → **silver** (bersih, tergabung) → **gold** (agregat tren, performa UMKM). Dashboard native ECharts/Plotly (seperti Fase 0 PSD), laporan bulanan otomatis.

**Jejak Lestari (regeneratif):**
- `daya_dukung`: kapasitas harian per spot vs kunjungan aktual → **peringatan over-capacity** (ekowisata bertanggung jawab).
- `dana_konservasi`: akumulasi porsi reinvestment + laporan penggunaan transparan.
- `indikator_ekologi`: kesehatan terumbu karang, populasi lumba-lumba, sampah — **diisi dari data konservasi Tahun 1–2** (menyambungkan seluruh roadmap).
- `neraca_regeneratif`: skor gabungan ekologi-sosial-ekonomi, distribusi pendapatan komunitas → KPI setara GMV.

**API:** `GET /analitik/tren`, `GET /analitik/umkm`, `GET /regeneratif/daya-dukung`, `GET /regeneratif/neraca`, `GET /regeneratif/dana`.

**Frontend:** dashboard Pokdarwis, panel daya dukung (lampu hijau/kuning/merah), halaman transparansi dana konservasi, Neraca Regeneratif publik.

**Gerbang pytest:** agregat gold == sumber transaksional; alarm daya dukung memicu di ambang benar; saldo dana konservasi = Σ porsi reinvestment.

**Inventaris brief:** B15/F15 ETL medallion+dashboard tren · B16/F16 Performa UMKM · B17/F17 Daya dukung · B18/F18 Dana konservasi · B19/F19 Neraca Regeneratif.

---

### FASE 4 — Kemandirian & Replikasi
*Peta ke roadmap Tahun 5 (kemandirian mitra & replikasi model).*

**Tujuan.** Model bisa direplikasi ke desa wisata lain di Lampung (target replikasi di proposal), platform tetap jalan tanpa pendampingan.

**Modul:** Nusantara (multi-tenant white-label + tata kelola).

**Cakupan:**
- **Onboarding desa baru** self-service (tenant sudah ada sejak F0 → tinggal alur & template).
- **White-label**: tema/branding per desa, domain kustom.
- **Tata kelola & keberlanjutan**: peran perangkat desa, model pendanaan operasional, ekspor data (kepemilikan komunitas).
- **Kematangan PWA/mobile** & hardening.
- **Marketplace lintas-desa** (opsional): discovery antar destinasi.

**API:** `POST /admin/desa` (provisioning), `GET/PUT /desa/{id}/tema`, `POST /desa/{id}/ekspor`.

**Gerbang pytest:** provisioning desa baru terisolasi (tanpa bocor data); ekspor lengkap & bisa di-restore; tema per-desa tak saling ganggu.

**Inventaris brief:** B20/F20 Provisioning+onboarding · B21/F21 White-label tema · B22/F22 Ekspor/kepemilikan data · B23/F23 Hardening & PWA matang.

---

## ★ FITUR UNGGULAN — Misi Kiluan (Regeneratif)

Ini pembedanya. Mengubah "pariwisata regeneratif" dari slogan jadi **loop terukur**. Satu fitur, tiga lingkar peserta yang saling menguatkan (*flywheel*):

> **Ide inti:** wisatawan *belajar + beraksi* melestarikan → owner *terdorong* menerapkan praktik regeneratif karena terbukti menaikkan booking → warga/perangkat desa *menyediakan & memverifikasi* data ekologi → semuanya terukur di Neraca Regeneratif. Insentifnya **nyata (ekonomi & data)**, bukan imbauan moral.

```
   Wisatawan (belajar+aksi) ──► permintaan ke penyedia regeneratif
        ▲                                   │
        │ diskon/badge/sertifikat           ▼
   Owner naik kelas ◄──── booking naik ──── ranking Pasar Desa
        │  (praktik regeneratif)            ▲
        ▼                                   │ bukti data
   Warga/perangkat desa (monitoring & verifikasi) ──► Neraca Regeneratif
```

### A. Sisi Wisatawan — *Penjelajah Lestari* & *Paspor Lestari*
Quest yang menempel pada aktivitas **nyata** selama kunjungan:
- **Belajar dulu (micro-lesson):** modul singkat *wajib* sebelum/di lokasi — kode etik lumba-lumba (jaga jarak, jangan kejar), jangan sentuh/injak karang, sampah bawa-pulang. Menuntaskan lesson → membuka quest. *(edukasi tercapai di sini)*
- **Aksi terverifikasi:** tanam mangrove, adopsi karang, bersih pantai, ikut monitoring lumba-lumba bersama pemandu bersertifikat. Tiap aksi = satu misi.
- **Reward:** stempel di **Paspor Lestari** (impact passport pribadi — "kamu bantu tanam 5 mangrove, kurangi 2 kg sampah"), badge, sertifikat digital, dan **diskon dari UMKM bersertifikat**. Reward ini mengarahkan permintaan ke penyedia regeneratif → menutup flywheel.

### B. Sisi Owner (UMKM/Agen/Pokdarwis) — *Naik Kelas Lestari*
Sertifikasi bertingkat dikemas sebagai progresi quest — **inilah yang menarik owner**:
- **Kartu Aksi:** praktik konkret dengan syarat bukti — tanpa plastik sekali pakai, sumber bahan lokal, kelola limbah, pekerjakan warga, sisihkan % ke dana konservasi, pandu bersertifikat. Tiap kartu punya modul "kenapa ini penting" → owner **belajar sambil naik kelas**.
- **Tingkat (tema bahari):** 🌱 **Tunas** → 🐚 **Bahari** → 🐬 **Lumba-Lumba**. Tiap tingkat = kumpulan kartu tervalidasi.
- **Insentif yang membuatnya nyata:** tingkat lebih tinggi → **badge di listing + boost ranking di Pasar Desa** → lebih sering dilihat & di-booking. Dashboard menunjukkan bukti datanya (sisi C). Jadi owner menerapkan strategi regeneratif karena **terbukti menaikkan pendapatan**, bukan karena diminta.

### C. Sisi Data — Loop dari owner–warga–perangkat desa
Verifikasi & monitoring menjadi sumber data, lalu menjadi insight:
- **Pengumpulan (PWA offline):** warga & perangkat desa mengisi form monitoring sederhana — jumlah mangrove yang *bertahan hidup* (bukan sekadar ditanam), indeks kesehatan karang, kg sampah terkumpul, kunjungan per spot. Bisa diisi tanpa sinyal, sinkron belakangan.
- **Verifikasi aksi:** QR check-in di **Stasiun Lestari** (dermaga lumba-lumba, titik mangrove) + konfirmasi satu-ketuk oleh pemandu/Pokdarwis + foto geotag. Aksi *berbukti*, bukan klaim sepihak.
- **Analisis:**
  - *Untuk owner:* korelasi praktik regeneratif ↔ rating/booking → "listing tingkat Lumba-Lumba rata-rata X% lebih banyak booking". Nudge berbasis data.
  - *Untuk perangkat desa:* dampak per spot vs **daya dukung**, peta panas aksi regeneratif, laporan dana konservasi transparan.
  - *Untuk wisatawan:* ringkasan dampak pribadi di Paspor Lestari.
- **Kejujuran regeneratif:** klaim dampak (mis. "1.000 mangrove") divalidasi oleh data *survival monitoring* warga, bukan angka tanam mentah — inilah yang memisahkan Kiluan dari *greenwashing*.

### Entitas data
`misi` (jenis, target, syarat verifikasi) · `paspor_lestari(user)` · `stempel` · `kartu_aksi` · `sertifikasi_owner(owner, tingkat, kartu_tervalidasi[])` · `stasiun_lestari`(QR, geo) · `verifikasi`(metode, verifikator, bukti) · `monitoring_ekologi`(spot, indikator, nilai, waktu, pencatat).

### API
`GET /misi?desa=` · `POST /misi/{id}/mulai` · `POST /misi/{id}/verifikasi` · `GET /paspor/saya` · `GET/POST /owner/kartu-aksi` · `POST /owner/kartu-aksi/{id}/ajukan` · `POST /monitoring` · `GET /regeneratif/insight`.

### Frontend
`/[desa]/misi` (katalog quest + micro-lesson) · `/paspor` (impact passport) · dashboard owner *Naik Kelas Lestari* (progres kartu + tingkat) · form monitoring warga (offline-first) · panel insight regeneratif (owner & perangkat desa).

### Penempatan fase
- **F1 (seed):** *Naik Kelas Lestari* owner + kartu aksi + boost ranking Pasar Desa (cukup butuh Pasar Desa).
- **F2:** *Penjelajah Lestari* quest + Paspor + QR check-in (butuh booking/kehadiran).
- **F3:** loop data penuh — monitoring warga, verifikasi berbukti, insight & korelasi, integrasi ke Neraca Regeneratif (Jejak Lestari).

### Gerbang pytest
verifikasi menolak klaim tanpa bukti; naik-tingkat hanya jika semua kartu syarat tervalidasi; boost ranking proporsional & auditable; nilai monitoring feed Neraca Regeneratif konsisten.

---

## ★ PWA: Bisa Di-install? & Strategi Pengenalan ke Warga

**Bisa di-install — ya.** Karena Kiluan adalah PWA (manifest + service worker + HTTPS di `kiluan.sainsdataciv.com`):
- **Android (Chrome):** muncul prompt "Tambah ke Layar Utama"/Install → jadi ikon aplikasi, buka layar penuh (standalone), jalan offline untuk konten yang sudah dibuka. **Tanpa Play Store.**
- **iOS (Safari):** lewat tombol Share → "Add to Home Screen" (manual, tidak ada prompt otomatis). Sejak iOS 16.4+ PWA terpasang bisa menerima push notification.
- **Desktop (Chrome/Edge):** ikon install di address bar.
- **Update otomatis:** cukup deploy ke server; pengguna dapat versi baru tanpa update dari store.

Kenapa PWA tepat untuk Teluk Kiluan: sinyal terbatas → *offline-first*; hemat kuota & penyimpanan; tanpa biaya/friksi store; satu basis kode untuk semua HP. **Tradeoff jujur:** di iOS instalasi manual (perlu dipandu), dan sebagian fitur perangkat lebih terbatas dari aplikasi native — untuk konteks ini tidak signifikan.

**Skema pengenalan ke warga** (menyambung Solusi 4 — 4 modul pelatihan; libatkan tim Digital Engagement mahasiswa: Farhanah, Lovianora):
1. **QR di titik kumpul** (balai pekon, dermaga): scan → PWA terbuka → dipandu "Tambah ke Layar Utama".
2. **Sesi "pasang bareng":** pendampingan tatap muka install di HP masing-masing, panduan Android vs iOS dipisah.
3. **Panduan bergambar + video pendek** (YouTube prodi Sains Data) langkah instalasi & pemakaian dasar.
4. **Kader Digital (train-the-trainer):** 3–5 anggota Pokdarwis dilatih jadi pendamping sebaya → keberlanjutan setelah PkM.
5. **Deep-link via WhatsApp:** warga sudah akrab WA → bagikan tautan `kiluan.sainsdataciv.com` yang langsung membuka PWA.
6. **Insentif awal:** badge **"Warga Perintis"** + poin bagi yang memasang & melengkapi profil (menyambung gamifikasi F1).

---

## 6. Pemetaan Fase → Roadmap 5 Tahun & Luaran PkM

| Roadmap PkM | Fase teknis PDW | Luaran terkait |
|---|---|---|
| Tahun 1–2: konservasi perairan | *pra-digital* → suplai baseline ekologi ke **Jejak Lestari (F3)** | Data dasar terumbu/lumba-lumba |
| Tahun 3: fondasi digital & literasi | **Fase 0** | Platform aktif, ≥10 spot/20 UMKM, buku panduan |
| Tahun 4: partisipasi + AI unggulan | **Fase 1 + thin Fase 2** | 30 akun, 10 paket, AI Assistant demo |
| Tahun 5: analitik & kemandirian | **Fase 2 penuh + Fase 3 + Fase 4** | Dashboard, Neraca Regeneratif, replikasi |

Luaran wajib proposal (Tabel 3) tercakup: **perangkat lunak/website** (F0–F1), **artikel Jurnal Renata** (metode & hasil F0–F1 + thin F2), **publikasi media** (peluncuran), **dokumentasi** (proses tiap fase), **HKI Hak Cipta** (kode + arsitektur PDW).

---

## 7. Keputusan Arsitektur & Tradeoff (jujur)

1. **Multi-tenant sejak F0** — biaya kompleksitas awal lebih tinggi, tapi tanpa ini replikasi Tahun 5 = rewrite. Layak.
2. **DuckDB, bukan warehouse** — cukup untuk skala desa & murah dipelihara lokal; batasnya di analitik real-time berat (tak dibutuhkan di sini).
3. **AI rule-based dulu, LLM di-gate** — sesuai proposal (*lightweight*, maintainable lokal). LLM chatbot opsional & bisa dimatikan → kendali biaya + kedaulatan data. Tradeoff: rekomendasi kurang "pintar" di awal; dapat ditingkatkan bertahap.
4. **Pembayaran manual→gateway** — mulai transfer+verifikasi (realistis untuk desa & budget Rp20jt), slot gateway disiapkan. Tradeoff: friksi UX di awal.
5. **Regeneratif sebagai domain model, bukan modul terpisah** — `daya_dukung` & hook reinvestment ditanam sejak F0/F2 walau baru "menyala" di F3. Menambahkannya belakangan akan mengotori skema transaksi.
6. **Reinvestment loop** butuh kesepakatan tata kelola dana dengan Pokdarwis/perangkat desa — ini risiko **non-teknis** terbesar; harus disepakati di FGD (Kegiatan 1.2) sebelum F2.

---

## 8. Langkah Berikutnya

1. Kunci **skema DB Fase 0** (ERD detail) + kontrak API → jadi ADR pertama.
2. Susun **scaffold Python murni + pytest** Fase 0 (pola PSD) sebelum brief.
3. Tulis **brief Cursor B0/F0 … B4/F4** dengan "Langkah 0 — Orientasi repo".
4. Finalkan **nama publik** & identitas visual (ITERA color scheme).
5. Sepakati **model tata kelola dana konservasi** bersama mitra (blocker Fase 2).

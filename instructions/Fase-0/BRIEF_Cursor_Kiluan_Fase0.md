# Brief Cursor — Fase 0 Kiluan (B0/F0 … B4/F4)

**Untuk:** agen Cursor (backend + frontend berpasangan).
**Rujukan wajib (Project Knowledge / `docs/`):** `BLUEPRINT_Platform_Desa_Wisata_Regeneratif.md`, `ERD_Kiluan_Fase0.md`, `KONTRAK_API_Kiluan_Fase0.md`, dan **scaffold** `kiluan-backend/` (domain + skema + service + repo in-memory + `model/tabel.py`).
**Prinsip:** blueprint-first, multi-tenant per-`desa_id` sejak awal, enum di aplikasi + CHECK, soft delete pada konten, snake_case Bahasa Indonesia, tak ada perubahan skema tanpa Alembic.

> **Cara pakai.** Kerjakan pasangan **berurutan** B0→B1→B2→B3→B4. Backend (`B*`) dan frontend (`F*`) satu nomor boleh paralel: frontend memakai mock kontrak API sampai backend-nya siap. Setiap brief **WAJIB** dibuka dengan **Langkah 0** di bawah sebelum menyentuh kode.

---

## Langkah 0 — Orientasi repo (template, tempel di awal SETIAP brief)

Sebelum menulis/mengubah kode apa pun, agen:
1. Membaca `docs/ERD_Kiluan_Fase0.md` + `docs/KONTRAK_API_Kiluan_Fase0.md` untuk modul yang disentuh brief ini.
2. Memetakan struktur repo: `backend/app/{domain,skema,repo,layanan,model}`, `frontend/app`, `infra/`. Catat file yang akan **disentuh** vs yang jadi **rujukan**.
3. Membaca konvensi wajib: filter `desa_id` di semua query domain; amplop error `{"galat":{"kode","pesan","rincian"}}`; lintas-tenant → **404, bukan 403**; endpoint publik hanya `status=publikasi` & `dihapus_pada IS NULL`; keyset pagination (`?batas=&kursor=`).
4. Menjalankan `cd backend && pytest -q` untuk memastikan baseline **hijau**; jangan memecahkannya.
5. **Tidak** mengubah `backend/app/domain/**` maupun `backend/app/skema/**` kecuali brief secara eksplisit memerintah — modul itu sudah teruji dan menjadi kontrak. Perubahan perilaku dilakukan lewat `layanan/` + `repo/`.
6. Memastikan setiap perubahan skema punya migrasi Alembic; tak ada `create_all` di jalur produksi.

Keluaran Langkah 0: ringkasan 5–10 baris berisi daftar file yang akan dibuat/diubah + risiko yang teridentifikasi, sebelum lanjut.

---

## Struktur target monorepo (dibentuk di B0, dipakai seterusnya)

```
kiluan/
├── backend/
│   ├── app/
│   │   ├── domain/         # DIPINDAH dari scaffold apa adanya (teruji, infra-free)
│   │   ├── skema/          # DIPINDAH dari scaffold apa adanya
│   │   ├── layanan/        # DIPINDAH; hanya bergantung pada antarmuka repo
│   │   ├── repo/
│   │   │   ├── memori.py   # test double (tetap dipakai unit test)
│   │   │   └── sql.py      # BARU: implementasi async SQLAlchemy, signature 1:1
│   │   ├── model/tabel.py  # sumber skema Alembic
│   │   ├── api/            # BARU: router FastAPI + dependency (auth, tenant, rbac)
│   │   ├── inti/           # BARU: konfigurasi, sesi DB, redis, minio, email
│   │   └── main.py         # BARU: app FastAPI + wiring
│   ├── alembic/            # migrasi
│   └── tests/              # unit (memori) + integrasi (sql thd Postgres uji)
├── frontend/               # Next.js App Router, TS, Tailwind, PWA
├── analytics/              # kosong di F0 (slot F3)
└── infra/                  # docker-compose, postgres+PostGIS, redis, minio, nginx
```

**Keputusan yang harus diambil di B0 (catat sebagai ADR):** service scaffold ditulis sinkron. Dua opsi mewujudkan ke FastAPI async:
- **(A) Port service ke async** (tambah `async/await`, repo async SQLAlchemy). Konsisten dengan stack async; biaya: sentuh tiap method service sekali.
- **(B) Pertahankan service sinkron** + sesi SQLAlchemy sinkron + endpoint FastAPI sinkron (jalan di threadpool). Nol perubahan service; biaya: menyimpang dari "async end-to-end".
Rekomendasi: **(A)** — konversi mekanis & sekali bayar, sejalan blueprint. Unit test `memori` boleh tetap sinkron bila repo memori dibuat async juga; samakan pola.

---

## Pasangan B0/F0 — Bootstrap

**Tujuan.** Repo hidup: infra Docker naik, migrasi Alembic bootstrap membuat seluruh 13 tabel F0 + seed, health check hijau, shell PWA ter-install. Belum ada fitur domain—ini fondasi.

### B0 (backend)
Langkah 0 (template di atas), lalu:
- **Infra** (`infra/docker-compose.yml`): `postgres` (image `postgis/postgis:16`), `redis`, `minio`, `nginx`, `backend`. Volume + healthcheck tiap service. `.env.contoh`.
- **Konfigurasi** (`app/inti/konfig.py`): Pydantic Settings (DATABASE_URL, REDIS_URL, MINIO_*, JWT_SECRET, dll). **Sesi DB** async (`app/inti/db.py`).
- **Pindahkan** `domain/`, `skema/`, `layanan/`, `repo/memori.py`, `model/tabel.py` dari scaffold ke `backend/app/` tanpa mengubah isi.
- **Alembic**: `alembic init`; satu migrasi **bootstrap** = `CREATE EXTENSION postgis;` + seluruh tabel dari `model/tabel.py` + **seed**: `peran` (8 baris sesuai enum), `kategori` awal, `desa` Teluk Kiluan (`status=aktif`), akun `admin` pertama + keanggotaan global admin. Uji `upgrade` lalu `downgrade` bersih.
- **App FastAPI** (`app/main.py`): mount `/api/v1`, handler error domain → amplop JSON (petakan `KesalahanDomain.http/kode`), CORS, `GET /api/v1/sehat` (cek DB + redis).
- **Gerbang:** `alembic upgrade head` & `downgrade base` jalan bersih; `GET /api/v1/sehat` → 200; `pytest -q` tetap hijau (unit memori tak tersentuh).

### F0 (frontend)
Langkah 0, lalu:
- **Scaffold Next.js** App Router + TypeScript + Tailwind. Struktur rute `app/`.
- **PWA**: `manifest.webmanifest` (nama Kiluan, ikon, theme color ITERA), service worker (Workbox/next-pwa) mode cache-first untuk shell + network-first konten. HTTPS via nginx.
- **Layout shell**: header/desa switcher placeholder, `app/layout.tsx`, halaman `/` placeholder discovery, komponen status offline.
- **Klien API** (`lib/api.ts`): fetch wrapper baca amplop error, sisipkan `Authorization`, keyset helper.
- **Gerbang:** Lighthouse PWA **installable**; shell termuat offline; build produksi sukses.

**Batas:** belum ada auth nyata, belum ada data destinasi. Rate limit & email nyata → B1.

---

## Pasangan B1/F1 — Auth & RBAC multi-tenant (Balai Warga)

**Tujuan.** Siklus identitas penuh + otorisasi per-desa. Wujudkan `layanan/auth.py` & `layanan/keanggotaan.py` (sudah teruji di scaffold) ke endpoint nyata + repo SQLAlchemy.

### B1 (backend)
Langkah 0, lalu:
- **`repo/sql.py`**: implementasi async SQLAlchemy untuk `RepoPengguna/Desa/Keanggotaan/Token` dengan **signature identik** `repo/memori.py`. `Penyimpanan` versi SQL.
- **Keamanan produksi** (`app/inti/keamanan.py`): ganti pbkdf2→**argon2**, access token HMAC→**JWT** (klaim minimal `sub/exp/iat/jti`; keanggotaan **tidak** di JWT). Pertahankan API fungsi agar `layanan/auth.py` tak berubah.
- **Endpoint** (`app/api/auth.py`, `app/api/saya.py`, `app/api/keanggotaan.py`): seluruh `/auth/*`, `/saya`, `/saya/keanggotaan`, `/peran`, dan tenant `/desa/{slug}/keanggotaan` (ajukan/kelola/putuskan) sesuai Kontrak §3. Refresh token via cookie `HttpOnly; Secure; SameSite=Lax`.
- **Dependency** (`app/api/deps.py`): `pengguna_saat_ini` (baca JWT), `resolusi_desa(slug)` → `desa_id` di context (+ set `app.desa_id` bila RLS nanti), `wajib_peran(aksi)` memanggil `konteks.wajib`.
- **Rate limit** (`app/inti/ratelimit.py`, Redis): `/auth/masuk` 5/mnt/IP → 429. **Email** dev: adapter yang me-log tautan verifikasi/reset (produksi: SMTP; di-gate di belakang antarmuka).
- **Tes:** unit `memori` port dari scaffold (`test_auth`, `test_rbac`, `test_isolasi_tenant`) tetap hijau; **integrasi** `repo/sql.py` thd Postgres uji (docker) — siklus daftar→verifikasi→masuk→segarkan→keluar; reuse refresh mencabut sesi; lintas-tenant 404; rate-limit 429.

### F1 (frontend)
Langkah 0, lalu:
- Rute `/(auth)/masuk`, `/(auth)/daftar`, `/(auth)/verifikasi-email`, `/(auth)/lupa-sandi`, `/(auth)/reset-sandi`.
- **Sesi**: access token di memori (bukan localStorage), refresh via cookie; interceptor auto-`/auth/segarkan` saat 401; logout.
- **Keanggotaan**: UI ajukan peran per-desa; **antrean kurasi** untuk pokdarwis/perangkat_desa (setujui/tolak). Guard rute berbasis peran.
- **Gerbang:** alur auth end-to-end jalan thd backend B1; halaman kelola keanggotaan hanya untuk peran berwenang; state 401→refresh transparan.

**Batas:** ubah email/sandi berjalan (re-verifikasi) ditunda; MFA di luar F0.

---

## Pasangan B2/F2 — Metadata Destinasi + Geo (Destinasi Kiluan)

**Tujuan.** CRUD destinasi/layanan/kalender + pencarian geospasial nyata (PostGIS). Wujudkan `layanan/destinasi.py` + tambah service layanan/kalender.

### B2 (backend)
Langkah 0, lalu:
- **`repo/sql.py`** +`RepoDestinasi/Layanan/Kalender/Kategori/Tag`. Pencarian radius pakai **PostGIS `ST_DWithin`** + **GIST** index `lokasi`/`area` (ganti haversine scaffold; logika/urutan hasil identik + `jarak_m`).
- **Endpoint** (Kontrak §5): destinasi (buat/ubah/`/status`/soft-delete/tag), layanan (CRUD + kepemilikan penyedia), kalender (CRUD; ekspansi RRULE **di klien** di F0), `GET /desa/{slug}/tag`, `GET /kategori`.
- **RBAC**: publikasi destinasi hanya pengelola; layanan "sendiri" untuk umkm/agen (kepemilikan), "semua" untuk pengelola.
- **Tes:** unit `test_destinasi` port; integrasi PostGIS radius benar + `jarak_m` terurut; unik `(desa_id,slug)`→409; soft delete hilang dari publik.

### F2 (frontend)
Langkah 0, lalu:
- `/[desa]` beranda desa; dashboard pengelola: form buat/ubah destinasi (peta pemilih titik/poligon — Leaflet/MapLibre), toggle status, editor layanan, editor kalender (RRULE UI).
- **Offline-first**: entri lapangan tersimpan lokal, sinkron tertunda (IndexedDB + antrean).
- **Gerbang:** pengelola bisa buat→publikasi destinasi; wisatawan tak melihat draft; input geo valid → tersimpan.

**Batas:** booking/harga transaksional → F2 (fase, bukan brief) Dermaga. `layanan.umkm_id` → F1 fase.

---

## Pasangan B3/F3 — Etalase & Discovery + Halaman Spot (Gerbang)

**Tujuan.** Permukaan publik: discovery lintas-desa (root), pencarian per-desa, halaman detail spot lengkap.

### B3 (backend)
Langkah 0, lalu:
- **Endpoint** (Kontrak §4): `GET /discovery/desa`, `GET /discovery/destinasi` (agregasi `publikasi` lintas desa `aktif`), `GET /desa/{slug}`, `GET /desa/{slug}/destinasi` (cari: kategori/tag/`dekat`/`q`/keyset), `GET /desa/{slug}/destinasi/{id|slug}` (detail + media/tag/layanan/kalender).
- Wujudkan `layanan/discovery.py`. DTO respons ringkas/detail sesuai Kontrak §7.
- **Tes:** discovery hanya desa `aktif` & konten `publikasi`; keyset stabil; detail resolusi slug dalam scope desa (lintas → 404).

### F3 (frontend)
Langkah 0, lalu:
- `/` discovery multi-desa (peta + daftar, filter, cari), `/[desa]` etalase, `/[desa]/spot/[id]` detail (galeri, peta, layanan terkait, kalender aktivitas).
- SSR/ISR untuk SEO konten publik; keyset "muat lebih banyak".
- **Gerbang:** halaman publik hanya konten publikasi; radius/geo query benar; detail memuat relasi; performa & aksesibilitas layak.

**Batas:** rekomendasi AI (Pemandu) → F2 fase.

---

## Pasangan B4/F4 — Media MinIO + Galeri

**Tujuan.** Unggah media (presigned) + lampiran polimorфik. Wujudkan `layanan/media.py`.

### B4 (backend)
Langkah 0, lalu:
- **`repo/sql.py`** `RepoMedia/Lampiran` + adapter **MinIO** nyata (`app/inti/minio.py`) menggantikan `ObjectStorePalsu` (signature `presign_put`/`ada` sama).
- **Endpoint** (Kontrak §5.4–5.5): `POST /desa/{slug}/media/presign`, `/media/konfirmasi`, `GET/DELETE /media/{id}`, `POST/PATCH/DELETE /desa/{slug}/lampiran`. `utama` tunggal per entitas dijaga service.
- **Lifecycle** MinIO untuk file "yatim" (di-PUT tapi tak dikonfirmasi).
- **Tes:** unit `test_geo_media_paginasi` (bagian media/lampiran) port; integrasi presign→PUT→konfirmasi valid; konfirmasi tanpa objek → 422; `utama` tunggal.

### F4 (frontend)
Langkah 0, lalu:
- Uploader dua-langkah (presign → PUT langsung ke MinIO → konfirmasi metadata), progress, retry offline.
- Galeri per entitas: urut, set foto sampul (`utama`), hapus.
- **Gerbang:** unggah besar via presigned jalan; galeri menampilkan `utama` sebagai sampul; hapus melepas lampiran.

**Batas:** transcoding/varian gambar & CDN → pasca-F0.

---

## Peta ketergantungan & luaran F0

```
B0/F0 ──► B1/F1 ──► B2/F2 ──► B3/F3
                 └──────────► B4/F4   (butuh entitas dari B2 untuk dilampiri)
```
Target luaran F0 (Solusi 1 proposal): ≥10 spot, ≥15 layanan, ≥20 profil UMKM terinput (UMKM di F0 = profil statis; transaksi menyusul). Gerbang tiap pasangan = subset Kontrak §9.

---

## Langkah selanjutnya (setelah brief F0 dijalankan)

1. **Eksekusi B0→B4 di Cursor** berurutan; tiap brief hijaukan gerbang test-nya sebelum lanjut. Simpan keputusan async (A/B), pilihan email adapter, dan detail MinIO sebagai **ADR** pendek di `docs/adr/`.
2. **Tutup F0**: jalankan seluruh gerbang `pytest` §9 + Lighthouse PWA; isi data seed nyata (10 spot Kiluan). Ini "platform aktif dapat diakses publik" (luaran wajib PkM).
3. **Masuk siklus Fase 1** (Pasar Desa · Dapur Konten · Lencana Warga) mengikuti alur standar: ERD F1 **sudah ada** di Project Knowledge → tinggal **turunkan Kontrak API F1** → **scaffold Python murni + pytest F1** → **brief B5/F5 … B9b/F9b**. Perhatikan ALTER F0: `layanan.umkm_id` + perluasan `media_lampiran.entitas_tipe` (butuh migrasi Alembic increment, bukan bootstrap).
4. **Thin slice Fase 2** (Pemandu AI rule-based + jalur pembayaran manual) sebagai demo unggulan PkM. ERD F2 (Dermaga escrow) **sudah dirancang**; untuk PkM aktifkan tahap-1 manual, tunda disbursement/refund otomatis.
5. **Blocker non-teknis yang harus diselesaikan paralel** (bukan tugas Cursor): FGD tata kelola dana konservasi & `persen_reinvestasi` dengan Pokdarwis sebelum menyalakan F2; kesepakatan sebelum go-live.

> Catatan: F0 sengaja **tidak** menyalakan RLS per-desa (baru di F4). Dependency `resolusi_desa` di B1 sudah menyiapkan set `app.desa_id`, jadi mengaktifkan RLS nanti = tambah kebijakan DB, bukan refactor aplikasi.

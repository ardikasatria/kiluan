# Kontrak API Fase 0 — Kiluan

**Cakupan:** **Balai Warga** (auth, identitas, keanggotaan RBAC), **Gerbang** (discovery publik lintas & per-desa), **Destinasi Kiluan** (destinasi, layanan, kalender, media, tag).
**Diturunkan dari:** `ERD_Kiluan_Fase0.md` (13 tabel). Setiap resource memakai nama field snake_case Bahasa Indonesia persis seperti ERD.
**Status:** kandidat ADR-01. Kunci ini sebelum scaffold + `pytest`.

---

## 1. Konvensi umum

**Base path & versi.** `/api/v1`. Versi mayor di path; perubahan breaking → `/api/v2`.

**Format.** Request/response `application/json` (kecuali upload biner via MinIO presigned). Semua waktu `timestamptz` ISO-8601 UTC (`2025-07-07T04:15:00Z`). UUID v7 untuk PK entitas.

**Resolusi tenant.** Path `/desa/{slug}` → `desa_id`. Middleware me-resolve slug sekali, menaruh `desa_id` di context request, dan (saat RLS menyala di F4) men-set `app.desa_id` pada koneksi. Endpoint global (`/auth/*`, `/saya`, `/peran`, `/kategori`, `/discovery/*`) tidak ber-slug. **Tak ada satu pun query domain tanpa filter `desa_id`.**

**Autentikasi.**
- **Access token:** JWT Bearer di header `Authorization: Bearer <token>`, umur pendek (±15 mnt). Klaim minimal: `sub` (pengguna_id), `exp`, `iat`, `jti`. **Keanggotaan/peran TIDAK ditanam di JWT** — di-resolve dari `keanggotaan` per request (indeks `(desa_id, peran_id, status)` murah). Alasan: persetujuan/pencabutan peran langsung berlaku tanpa menunggu token kedaluwarsa. Tradeoff: satu lookup DB per aksi tertulis — dapat di-cache Redis bila perlu.
- **Refresh token:** opaque random 256-bit, disimpan **hash**-nya di `token_auth(tipe=penyegar)`. Dikirim sebagai cookie `HttpOnly; Secure; SameSite=Lax` (rekomendasi web PWA) — body JSON tetap didukung untuk klien non-browser. **Rotasi wajib** tiap `POST /auth/segarkan`: token lama ditandai `dipakai_pada`, token baru diterbitkan. Reuse token terpakai → seluruh sesi pengguna dicabut (deteksi pencurian).
- Tautan sekali-pakai (`verifikasi_email`, `reset_sandi`) juga hash di `token_auth`, ber-`kedaluwarsa_pada`.

**Otorisasi.** RBAC + scope per-desa. Cek `keanggotaan` aktif `(pengguna_id, desa_id, peran)`. Peran global (`admin`, `desa_id=null`) melewati scope. Matriks lengkap di §6.

**Paginasi.** Keyset (bukan offset) — PK UUIDv7 terurut waktu, jadi cursor = PK terakhir. Query: `?batas=20&kursor=<opaque>`. Maks `batas` = 100, default 20.
```json
"meta": { "kursor_berikutnya": "018f...", "ada_lagi": true, "batas": 20 }
```
Tradeoff: keyset tak bisa loncat ke "halaman N", tapi stabil saat data ditambah dan indeks-friendly. Untuk F0 tak butuh page-jump.

**Amplop error** (konsisten semua endpoint):
```json
{ "galat": { "kode": "validasi_gagal", "pesan": "Email tidak valid.",
  "rincian": [ { "field": "email", "pesan": "format salah" } ] } }
```

| Kode | HTTP | Makna |
|---|---|---|
| `validasi_gagal` | 422 | Body/query gagal validasi Pydantic |
| `tidak_terautentikasi` | 401 | Token hilang/kedaluwarsa/invalid |
| `tidak_berwenang` | 403 | Terautentikasi tapi peran/scope kurang |
| `tidak_ditemukan` | 404 | Resource tak ada / lintas-tenant / soft-deleted |
| `konflik` | 409 | Pelanggaran unik (slug, email, keanggotaan ganda) |
| `terlalu_banyak_permintaan` | 429 | Rate-limit (Redis) terlampaui |
| `galat_server` | 500 | Kesalahan tak tertangani |

**Catatan lintas-tenant = 404, bukan 403.** Resource desa lain dijawab `tidak_ditemukan` agar tak membocorkan eksistensinya.

**Soft delete.** Endpoint publik selalu memfilter `dihapus_pada IS NULL` + `status='publikasi'`. Endpoint kelola bisa melihat `draft`/`arsip` sesuai peran.

**Rate limit & CORS.** Rate-limit per-IP + per-token via Redis (mis. `/auth/masuk` 5/mnt/IP). CORS di-whitelist ke origin frontend + domain desa (F4).

---

## 2. Ringkasan endpoint

### Global
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| POST | `/auth/daftar` | Registrasi pengguna | publik |
| POST | `/auth/verifikasi-email` | Aktivasi via token | publik |
| POST | `/auth/kirim-ulang-verifikasi` | Kirim ulang tautan | publik |
| POST | `/auth/masuk` | Login → access+refresh | publik |
| POST | `/auth/segarkan` | Rotasi refresh → access baru | refresh |
| POST | `/auth/keluar` | Cabut refresh (logout) | refresh |
| POST | `/auth/lupa-sandi` | Minta tautan reset | publik |
| POST | `/auth/reset-sandi` | Set sandi baru via token | publik |
| GET | `/saya` | Profil + keanggotaan diri | user |
| PATCH | `/saya` | Ubah nama/telepon/avatar | user |
| GET | `/saya/keanggotaan` | Daftar peran lintas-desa | user |
| GET | `/peran` | Referensi peran (RBAC) | publik |
| GET | `/kategori` | Taksonomi destinasi global | publik |
| GET | `/discovery/desa` | Daftar desa `aktif` (root) | publik |
| GET | `/discovery/destinasi` | Cari destinasi lintas-desa | publik |

### Tenant `/desa/{slug}`
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| GET | `/desa/{slug}` | Profil desa | publik |
| POST | `/desa/{slug}/keanggotaan` | Ajukan peran di desa | user |
| GET | `/desa/{slug}/keanggotaan` | Kelola antrean keanggotaan | pokdarwis/perangkat/admin |
| PATCH | `/desa/{slug}/keanggotaan/{id}` | Setujui/tolak/nonaktif | pokdarwis/perangkat/admin |
| GET | `/desa/{slug}/tag` | Tag global+lokal | publik |
| GET | `/desa/{slug}/destinasi` | Cari/daftar destinasi | publik* |
| GET | `/desa/{slug}/destinasi/{id\|slug}` | Detail destinasi | publik* |
| POST | `/desa/{slug}/destinasi` | Buat destinasi (`draft`) | pokdarwis/perangkat/admin |
| PATCH | `/desa/{slug}/destinasi/{id}` | Ubah destinasi | pokdarwis/perangkat/admin |
| PATCH | `/desa/{slug}/destinasi/{id}/status` | Transisi draft↔publikasi↔arsip | pokdarwis/perangkat/admin |
| DELETE | `/desa/{slug}/destinasi/{id}` | Soft delete | pokdarwis/perangkat/admin |
| POST | `/desa/{slug}/destinasi/{id}/tag` | Tempel tag | pokdarwis/perangkat/admin |
| DELETE | `/desa/{slug}/destinasi/{id}/tag/{tag_id}` | Lepas tag | pokdarwis/perangkat/admin |
| GET | `/desa/{slug}/layanan` | Daftar layanan | publik* |
| GET | `/desa/{slug}/layanan/{id}` | Detail layanan | publik* |
| POST | `/desa/{slug}/layanan` | Buat layanan | penyedia/pokdarwis/perangkat/admin |
| PATCH | `/desa/{slug}/layanan/{id}` | Ubah layanan | pemilik/pokdarwis/perangkat/admin |
| PATCH | `/desa/{slug}/layanan/{id}/status` | Transisi status | pemilik/pokdarwis/perangkat/admin |
| DELETE | `/desa/{slug}/layanan/{id}` | Soft delete | pemilik/pokdarwis/perangkat/admin |
| GET | `/desa/{slug}/kalender` | Daftar aktivitas | publik* |
| GET | `/desa/{slug}/kalender/{id}` | Detail aktivitas | publik* |
| POST | `/desa/{slug}/kalender` | Buat aktivitas | pokdarwis/perangkat/admin |
| PATCH | `/desa/{slug}/kalender/{id}` | Ubah aktivitas | pokdarwis/perangkat/admin |
| DELETE | `/desa/{slug}/kalender/{id}` | Hapus (hard) | pokdarwis/perangkat/admin |
| POST | `/desa/{slug}/media/presign` | Minta URL upload MinIO | user berperan |
| POST | `/desa/{slug}/media/konfirmasi` | Finalisasi metadata media | user berperan |
| GET | `/desa/{slug}/media/{id}` | Metadata media | user berperan |
| DELETE | `/desa/{slug}/media/{id}` | Hapus media | pengunggah/pokdarwis/admin |
| POST | `/desa/{slug}/lampiran` | Tempel media ke entitas | pemilik entitas/pokdarwis/admin |
| PATCH | `/desa/{slug}/lampiran/{id}` | Set `utama`/`urutan` | pemilik entitas/pokdarwis/admin |
| DELETE | `/desa/{slug}/lampiran/{id}` | Lepas media | pemilik entitas/pokdarwis/admin |

\* *publik hanya melihat `status=publikasi` & `dihapus_pada IS NULL`; peran pengelola melihat semua status.*

---

## 3. Balai Warga — Auth & Identitas

### 3.1 `POST /auth/daftar`
```json
// req
{ "email": "budi@contoh.id", "nama": "Budi", "kata_sandi": "•••••••", "telepon": "0812..." }
// 201
{ "pengguna": { "id": "018f...", "email": "budi@contoh.id", "nama": "Budi", "status": "pending" },
  "pesan": "Tautan verifikasi dikirim ke email." }
```
Efek: buat `pengguna(status=pending)`, terbitkan `token_auth(tipe=verifikasi_email)`, kirim email. Email duplikat → `409 konflik`. **Tidak** langsung memberi sesi (harus verifikasi dulu). Default: pengguna baru otomatis mendapat keanggotaan global `wisatawan` (auto-`aktif`) — atau ditunda sampai apply per-desa; lihat catatan §3.7.

### 3.2 `POST /auth/verifikasi-email`
```json
{ "token": "<token mentah dari tautan>" }   // → 200 { "status": "aktif" }
```
Validasi hash + belum kedaluwarsa + belum dipakai → `pengguna.status=aktif`, set `email_terverifikasi_pada`, tandai token `dipakai_pada`. Token invalid/kedaluwarsa → `422`.

### 3.3 `POST /auth/masuk`
```json
// req
{ "email": "budi@contoh.id", "kata_sandi": "•••••••" }
// 200 — refresh via cookie HttpOnly; access di body
{ "access_token": "eyJ...", "tipe": "Bearer", "kedaluwarsa_dalam": 900,
  "pengguna": { "id": "018f...", "nama": "Budi", "email": "budi@contoh.id",
    "keanggotaan": [ { "desa_slug": "teluk-kiluan", "peran": "pokdarwis", "status": "aktif" } ] } }
```
Verifikasi argon2/bcrypt. Set `login_terakhir`. Akun `pending` → `403` (belum verifikasi); `tersuspensi`/`nonaktif` → `403`. Kredensial salah → `401` (pesan generik, tanpa membedakan email vs sandi).

### 3.4 `POST /auth/segarkan`
Ambil refresh dari cookie/body → validasi hash & belum `dipakai_pada` & belum kedaluwarsa → terbitkan access baru + **rotasi** refresh. Token terpakai-ulang → `401` + cabut semua sesi pengguna.

### 3.5 `POST /auth/keluar`
Cabut (tandai dipakai/hapus) refresh aktif → `204`.

### 3.6 `POST /auth/lupa-sandi` & `POST /auth/reset-sandi`
`lupa-sandi { email }` → selalu `200` (jangan bocorkan keberadaan email), terbitkan `token_auth(tipe=reset_sandi)` bila ada. `reset-sandi { token, kata_sandi_baru }` → set hash baru, cabut seluruh refresh pengguna.

### 3.7 `GET /saya` · `PATCH /saya` · `GET /saya/keanggotaan`
`GET /saya` → profil + array keanggotaan (semua desa). `PATCH /saya` ubah `nama`/`telepon`/`avatar_media_id`. Ubah email/sandi lewat alur khusus (re-verifikasi) — ditunda, cukup catatan di F0.

**Keanggotaan (tenant-scoped).**
- `POST /desa/{slug}/keanggotaan { peran: "pokdarwis" }` → buat baris `status=menunggu` (butuh persetujuan) untuk peran ber-`scoped_desa=true` seperti `pokdarwis|umkm|agen`. Peran `wisatawan` boleh auto-`aktif`. Duplikat `(pengguna, desa, peran)` → `409`.
- `GET /desa/{slug}/keanggotaan?peran=&status=` → antrean untuk pengelola.
- `PATCH /desa/{slug}/keanggotaan/{id} { status: "aktif" }` → setujui/tolak/nonaktif. Hanya `pokdarwis`/`perangkat_desa`/`admin`.

---

## 4. Gerbang — Discovery (publik)

### 4.1 `GET /discovery/desa`
Root multi-desa. `?dekat=lat,lng&radius_m=&q=&batas=&kursor=`. Hanya `desa.status=aktif`. F0 flagship = satu desa, endpoint disiapkan untuk F4.

### 4.2 `GET /discovery/destinasi`
Agregasi destinasi `publikasi` lintas desa `aktif`. Param sama seperti pencarian per-desa + `desa=` opsional. Di F0 praktis identik dengan pencarian Teluk Kiluan; disediakan agar frontend `/` tak berubah kontrak di F4.

### 4.3 `GET /desa/{slug}`
Profil desa publik: `nama`, `deskripsi`, `lokasi`, wilayah admin (`provinsi/kabupaten/kecamatan/pekon`), branding seed (`logo`, `warna_primer`). `404` jika slug tak ada / `status != aktif` (untuk publik).

### 4.4 `GET /desa/{slug}/destinasi` (cari)
Query:
```
?kategori=snorkeling            # kode kategori
&tag=ramah-keluarga             # bisa berulang
&dekat=-5.79,105.10&radius_m=5000   # PostGIS ST_DWithin
&q=lumba                        # full-text nama/deskripsi
&batas=20&kursor=...
```
Publik → hanya `status=publikasi`. Bila `dekat` dipakai, tiap item menyertakan `jarak_m` dan default terurut jarak; selain itu urut `dibuat_pada` desc (keyset). Response = array `Destinasi` ringkas (lihat §5).

### 4.5 `GET /desa/{slug}/destinasi/{id|slug}`
Detail lengkap: destinasi + `media[]` (urut, `utama`), `tag[]`, `layanan[]` publikasi terkait, `kalender[]` aktif terkait, `kategori`. Menerima UUID atau slug; slug diresolusi dalam scope desa (`UNIQUE(desa_id, slug)`).

---

## 5. Destinasi Kiluan — Manajemen

### 5.1 Destinasi (tulis)
`POST /desa/{slug}/destinasi`:
```json
{ "nama": "Pantai Gigi Hiu", "slug": "gigi-hiu", "deskripsi": "...",
  "kategori_id": 3,
  "lokasi": { "lat": -5.7912, "lng": 105.1033 },
  "area": null,
  "alamat": "Pekon Kiluan Negeri",
  "jam_operasional": { "sen": "06:00-18:00", "min": "06:00-18:00" },
  "status": "draft" }
```
→ `201` isi `Destinasi`. `dibuat_oleh` = pengguna token. `lokasi` **wajib** (`geography(Point,4326)`), `area` opsional polygon. Slug bentrok dalam desa → `409`.

`PATCH /desa/{slug}/destinasi/{id}` — partial update field yang sama.

`PATCH /desa/{slug}/destinasi/{id}/status { "status": "publikasi" }` — target `draft|publikasi|arsip`. **`publikasi` butuh peran** `pokdarwis|perangkat_desa|admin` (ERD §5). Ini enum sederhana, bukan state-machine ketat (state-machine penuh baru di paket F1).

`DELETE .../{id}` — soft delete (set `dihapus_pada`) → `204`. Hilang dari endpoint publik.

Tag: `POST .../{id}/tag { "tag_id": [5,9] }`; `DELETE .../{id}/tag/{tag_id}`.

### 5.2 Layanan
`GET /desa/{slug}/layanan?jenis=&destinasi_id=&status=&batas=&kursor=`. `POST` body:
```json
{ "nama": "Perahu lumba-lumba", "jenis": "transportasi", "deskripsi": "...",
  "harga": 350000, "satuan_harga": "per_paket",
  "destinasi_id": "018f...", "penyedia_id": "018f...",
  "ketersediaan": { "kuota_harian": 8 }, "status": "draft" }
```
`jenis` = enum ERD (`transportasi|pemandu|penginapan|sewa_alat|kuliner|tiket_masuk|lainnya`). `penyedia_id` opsional (pengguna). **Kolom `umkm_id` belum ada di F0** — ditambah saat F1. Update/soft-delete analog destinasi. Kepemilikan: penyedia hanya boleh mengubah layanannya sendiri; pengelola desa boleh semua.

### 5.3 Kalender aktivitas
`GET /desa/{slug}/kalender?destinasi_id=&tipe=`. `POST` body:
```json
{ "judul": "Lumba-lumba pagi", "tipe": "harian", "destinasi_id": "018f...",
  "waktu_mulai": "05:30", "waktu_selesai": "07:00",
  "pengulangan": { "freq": "DAILY" },
  "berlaku_mulai": "2025-06-01", "berlaku_sampai": null, "status": "aktif" }
```
`pengulangan` jsonb pola RRULE-like. **Ekspansi jadwal (materialisasi tanggal) dilakukan klien/PWA di F0**, bukan server — server hanya menyimpan aturan. Tradeoff: hemat backend, tapi klien perlu pustaka RRULE; ekspansi server-side (`?dari=&sampai=`) bisa ditambah bila dashboard butuh. `kalender_aktivitas` tak punya `dihapus_pada` → `DELETE` = hard delete (atau set `status=nonaktif`).

### 5.4 Media (MinIO, alur presigned)
Dipilih presigned dua-langkah (bukan proxy multipart lewat backend) demi upload besar/offline-friendly & beban backend rendah. Tradeoff: dua round-trip + perlu konfirmasi; file "yatim" (di-PUT tapi tak dikonfirmasi) dibersihkan job MinIO lifecycle.

`POST /desa/{slug}/media/presign`:
```json
// req
{ "nama_berkas": "gigihiu.jpg", "mime": "image/jpeg", "ukuran": 2480123 }
// 200
{ "media_id": "018f...", "objek_minio": "teluk-kiluan/2025/07/018f....jpg",
  "url_unggah": "https://minio.../put?X-Amz...", "kedaluwarsa_dalam": 600 }
```
Klien `PUT` biner langsung ke `url_unggah`, lalu:

`POST /desa/{slug}/media/konfirmasi`:
```json
{ "media_id": "018f...", "lebar": 1920, "tinggi": 1080, "alt": "Batu granit Gigi Hiu", "tipe": "foto" }
// → 201 Media
```
Backend verifikasi objek ada di MinIO, set `url` turunan, `diunggah_oleh`.

### 5.5 Lampiran polimorfik
`POST /desa/{slug}/lampiran`:
```json
{ "media_id": "018f...", "entitas_tipe": "destinasi", "entitas_id": "018f...",
  "urutan": 0, "utama": true }
```
`entitas_tipe` = `destinasi|layanan|desa|pengguna`. **`utama` tunggal per entitas** dijamin service (set `utama=false` lampiran lain saat satu jadi `utama`). `PATCH` ubah `urutan`/`utama`; `DELETE` lepaskan. Tanpa FK keras ke entitas (dijaga aplikasi) sesuai ERD §3.11.

---

## 6. Matriks RBAC (peran × aksi) — F0

Peran global `admin` (scoped_desa=false) melewati semua scope. Sisanya dicek per-desa via `keanggotaan` aktif.

| Aksi / Modul | wisatawan | kontributor | umkm | agen | pokdarwis | perangkat_desa | admin |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Baca discovery/destinasi/layanan publik | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ajukan keanggotaan | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Setujui/tolak keanggotaan | – | – | – | – | ✓ | ✓ | ✓ |
| Buat/ubah destinasi | – | – | – | – | ✓ | ✓ | ✓ |
| Publikasi/arsip destinasi | – | – | – | – | ✓ | ✓ | ✓ |
| Buat/ubah layanan sendiri | – | – | ✓¹ | ✓¹ | ✓ | ✓ | ✓ |
| Kelola semua layanan desa | – | – | – | – | ✓ | ✓ | ✓ |
| Buat/ubah kalender | – | – | – | – | ✓ | ✓ | ✓ |
| Unggah media | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tempel/lepas lampiran entitas | –² | –² | ✓¹ | ✓¹ | ✓ | ✓ | ✓ |

¹ hanya untuk entitas yang dimilikinya (`penyedia_id`/pembuatnya). ² kontributor mengunggah media untuk kontribusi baru di **F1** (`kontribusi`), belum menempel langsung di F0.
Aturan implementasi: definisikan matriks `(peran × aksi × modul)` sebagai tabel di aplikasi; dependency FastAPI `wajib_peran(...)` mengecek keanggotaan aktif + kepemilikan resource.

---

## 7. Skema objek (DTO ringkas)

Nama field mengikuti ERD. Field sensitif (`kata_sandi_hash`, `token_hash`) tak pernah keluar.

**Pengguna (ringkas):** `id, nama, email, avatar_media_id, status`.
**Keanggotaan:** `id, desa_slug, peran, status, dibuat_pada`.
**Desa:** `id, slug, nama, deskripsi, lokasi{lat,lng}, provinsi, kabupaten, kecamatan, pekon, logo_media_id, warna_primer, status`.
**Kategori:** `id, kode, nama, ikon, urutan`.
**Destinasi (ringkas):** `id, slug, nama, kategori{id,kode,nama}, lokasi{lat,lng}, alamat, status, media_utama{url,alt}, jarak_m?`.
**Destinasi (detail):** ringkas + `deskripsi, area(GeoJSON|null), jam_operasional, tag[], media[], layanan[], kalender[], dibuat_pada, diperbarui_pada`.
**Layanan:** `id, nama, jenis, deskripsi, harga, satuan_harga, destinasi_id, penyedia{id,nama}|null, ketersediaan, status`.
**Kalender:** `id, judul, tipe, destinasi_id, waktu_mulai, waktu_selesai, pengulangan, berlaku_mulai, berlaku_sampai, status`.
**Media:** `id, url, tipe, mime, ukuran, lebar, tinggi, alt, dibuat_pada`.
**Lampiran:** `id, media{...}, entitas_tipe, entitas_id, urutan, utama`.

Geo di response: `lokasi` sebagai `{lat,lng}`; `area` sebagai GeoJSON. Input `lokasi` juga `{lat,lng}` (backend → `ST_SetSRID(ST_MakePoint(lng,lat),4326)`).

---

## 8. Tradeoff arsitektur (jujur)

1. **Tenant di path (`/desa/{slug}/...`) vs query (`?desa=`).** Dipilih path: konsisten dengan rute frontend `/[desa]`, memudahkan set `app.desa_id` untuk RLS F4, dan cache/route lebih bersih. Discovery lintas-desa tetap di `/discovery/*` tanpa slug. Biaya: dua "kelas" URL (global vs tenant) yang harus dijaga.
2. **Peran di DB per-request vs klaim di JWT.** Dipilih DB lookup: pencabutan peran instan, tak ada token basi berisiko. Biaya: 1 query indexed/aksi tulis — cache Redis bila jadi hotspot.
3. **Refresh cookie HttpOnly vs token di body.** Cookie mengurangi risiko XSS mencuri token; body didukung untuk klien non-browser. Biaya: perlu proteksi CSRF (SameSite=Lax + double-submit bila lintas-site).
4. **Presigned upload vs proxy backend.** Presigned hemat backend & cocok offline; biaya: file yatim (dibersihkan lifecycle) + dua langkah.
5. **RRULE diekspansi klien vs server.** Klien di F0 (hemat backend); endpoint ekspansi server disiapkan bila dashboard/booking F2 memerlukannya.
6. **Keyset vs offset pagination.** Keyset stabil & indeks-friendly (UUIDv7), tapi tanpa page-jump. Cukup untuk F0.

---

## 9. Gerbang `pytest` (uji kontrak F0)

- **Auth lifecycle:** daftar → verifikasi → masuk → segarkan (rotasi) → keluar; token verifikasi/reset sekali-pakai & kedaluwarsa ditolak; reuse refresh mencabut sesi.
- **RBAC:** `wisatawan` gagal (`403`) membuat/mempublikasi destinasi; `pokdarwis` desa A gagal (`404`) mengelola resource desa B; `admin` global lolos scope.
- **Isolasi tenant:** tiap list/detail terfilter `desa_id`; resource desa lain → `404` (bukan `403`).
- **Publik vs kelola:** endpoint publik hanya mengembalikan `status=publikasi` & `dihapus_pada IS NULL`; soft-delete langsung hilang dari publik.
- **Geo:** `?dekat=&radius_m=` mengembalikan spot dalam radius benar (ST_DWithin) dan menyertakan `jarak_m` terurut.
- **Unik:** slug desa, email pengguna, `(desa_id, slug)` destinasi, `(pengguna, desa, peran)` keanggotaan → `409` saat bentrok.
- **Lampiran:** `utama` tunggal per entitas dijaga saat menandai media baru sebagai utama.
- **Media:** presign → konfirmasi menghasilkan `url` valid; konfirmasi tanpa objek MinIO ditolak.
- **Paginasi:** keyset stabil saat baris ditambah di tengah iterasi (tak ada duplikat/lewat).
- **Rate limit:** `/auth/masuk` melebihi ambang → `429`.

---

## 10. Batas F0 (kontrak yang sengaja ditunda)

- **F1:** endpoint `umkm`, `produk_jasa`, `paket_wisata` (+state-machine `POST .../transisi`), `kontribusi`, `kurasi`, `poin`/`badge`/`leaderboard`, seed `kartu_aksi`; ALTER `layanan.umkm_id`; perluasan `media_lampiran.entitas_tipe`.
- **F2:** `booking`, `transaksi` (+hook reinvestment), `pemandu/*` (AI), Misi/Paspor/Stasiun/verifikasi.
- **F3:** `monitoring`, `daya-dukung`, `dana-konservasi`, `neraca`, `analitik/*`.
- **F4:** `admin/desa` provisioning, `desa/{id}/tema`, `ekspor`, resolusi host→tema (white-label). RLS per-desa dinyalakan (kontrak set `app.desa_id` sudah disiapkan di §1).

Semua endpoint F0 sudah ber-slug/tenant sejak awal → penambahan modul lanjut = tambah resource, bukan refactor kontrak.

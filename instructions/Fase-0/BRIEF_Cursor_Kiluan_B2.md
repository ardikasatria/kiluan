# Brief Cursor — B2/F2: Destinasi + Geo + Modul Cuaca (BMKG)

**Prasyarat:** B0 (migrasi bootstrap hijau) & B1 (auth/RBAC) selesai. Stack **async** (ADR-0003).
**Rujukan:** `ERD_Kiluan_Fase0.md`, `KONTRAK_API_Kiluan_Fase0.md`, dan repo `backend/` B1.
**Pola acuan:** `app/repo/sql.py` (repo Auth) untuk mapping ORM↔domain; `app/inti/email.py` untuk adapter eksternal ber-gate; `app/api/deps.py` untuk `resolusi_desa`/`wajib_peran`.

## Langkah 0 — Orientasi repo (WAJIB)
Baca `KONTRAK_API §4–5`, struktur `backend/app/{domain,skema,layanan,repo,api}`, konvensi (filter `desa_id`; lintas-tenant→404; publik hanya `publikasi`+bukan soft-deleted; keyset). Jalankan `pytest -q` (harus tetap hijau). **Jangan** ubah `domain/**` & `skema/**`. Ringkas file yang akan disentuh + risiko sebelum ngoding.

---

## Bagian A — Destinasi & Geo (B2 backend)

Service `layanan/destinasi.py`, `discovery.py`, `LayananWisataLayanan` **sudah async & teruji** (unit hijau). Yang kurang: repo SQL + router.

1. **`app/repo/sql.py` +repo** `RepoDestinasiSQL/LayananSQL/KalenderSQL/KategoriSQL/TagSQL`, tanda tangan 1:1 dengan `repo/memori.py`, pola mapping seperti repo Auth. Tambah ke `Penyimpanan`.
   - **PostGIS**: tulis `lokasi` = `ST_SetSRID(ST_MakePoint(:lng,:lat),4326)`; baca `(lat,lng)` via `ST_Y/ST_X`. Cari radius = `ST_DWithin(lokasi, :titik, :radius_m)` + urut `ST_Distance` (ganti haversine; GIST sudah dibuat migrasi 0001). `jarak_m` dari `ST_Distance`.
   - Mapping `status`/`jenis`/`satuan_harga` = enum str-subclass (tanpa konversi, seperti Auth).
2. **Router** (`app/api/destinasi.py`, `layanan.py`, `kalender.py`, `desa.py`) sesuai Kontrak §4–5: destinasi CRUD + `/status` + soft-delete + `tag`; cari (`kategori`,`tag`,`dekat=lat,lng`,`radius_m`,`q`,keyset); detail (`id|slug`); layanan (CRUD+kepemilikan); kalender (CRUD; ekspansi RRULE di klien); `GET /desa/{slug}` profil; `GET /desa/{slug}/tag`. Pakai `wajib_peran(...)`.
3. **Gerbang:** unit lama tetap hijau; integrasi PostGIS (radius benar + `jarak_m` terurut); smoke buat→publikasi→cari.

---

## Bagian B — Modul Cuaca (BMKG) [tambahan B2, ber-gate, non-blocking]

Info cuaca untuk kenyamanan & **keselamatan** wisata. Read-only, cache-only, bisa dimatikan.

1. **Migrasi Alembic `0002` (increment, bukan bootstrap):** tambah `desa.kode_bmkg_adm4` (nullable), `desa.kode_perairan_bmkg` (nullable). Isi seed adm4 **Kiluan Negeri** — cari kodenya di `kodewilayah.id` / `github.com/kodewilayah/permendagri-72-2019` (format `18.xx.xx.xxxx`, Lampung=18); kode perairan dari geojson `peta-maritim.bmkg.go.id`.
2. **`app/inti/bmkg.py`** — adapter async `httpx` di belakang antarmuka (pola `email.py`), gated env `CUACA_AKTIF`:
   - Darat: `GET https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=<kode>` (prakiraan 3 hari; field `t,hu,ws,wd,weather_desc,vs,image,local_datetime`).
   - Maritim: `GET https://peta-maritim.bmkg.go.id/public_api/perairan` (gelombang, 4 jendela 12-12-24-24 jam).
   - **Cache Redis** `cuaca:{kode}` TTL ~3 jam (data BMKG update 2×/hari; rate limit **60 req/menit/IP** → cache wajib, jangan panggil per-request user). **Fail-soft**: bila BMKG error/down, kembalikan cache terakhir atau `status:"tak_tersedia"` tanpa merusak halaman.
3. **Router** `GET /api/v1/desa/{slug}/cuaca` → `{darat:{...}, maritim:{...}|null, sumber:"BMKG", diperbarui}`. Publik. `404` bila `kode_bmkg_adm4` kosong.
4. **WAJIB atribusi:** tampilkan "Sumber: BMKG" di UI (syarat lisensi data BMKG).
5. **Gerbang:** endpoint mengembalikan cache pada hit kedua (tak memanggil BMKG lagi); fail-soft saat BMKG dimatikan/error.

> **Catatan jujur (utamakan ini):** untuk wisata bahari Kiluan (perahu lumba-lumba, snorkeling), **prakiraan maritim (tinggi gelombang + angin)** lebih kritis untuk keselamatan daripada cuaca darat — jadikan itu "kartu keselamatan" utama, cuaca darat sekunder. Sampaikan sebagai **advisori**, bukan jaminan; jangan otomatis "aman/tidak aman" tanpa dasar. (Opsional lanjut: `desa.kode_bmkg_adm4` bisa pindah ke `pengaturan_desa` di F2, dan peringatan gelombang tinggi bisa memblokir booking di F2/F3 `pemakaian_kapasitas`.)

---

## Bagian C — F2 frontend (Next.js App Router, PWA)

Langkah 0 dulu. Lalu:
- **Dashboard pengelola** (guard peran): form buat/ubah destinasi + **map picker** (Leaflet/MapLibre) titik/poligon, toggle status, editor layanan & kalender (RRULE UI). Offline-first (IndexedDB + antrean sinkron).
- **Publik**: `/[desa]` etalase, `/[desa]/spot/[id]` detail (galeri, peta, layanan, kalender), + **widget Cuaca** (kartu gelombang laut & angin sebagai keselamatan, cuaca darat sekunder, ikon BMKG, label **"Sumber: BMKG"**).
- **Gerbang:** pengelola buat→publikasi; wisatawan tak lihat draft; geo valid tersimpan; widget cuaca tampil + fail-soft.

---

## Guardrails
- Skema DB via **Alembic increment `0002`** (bukan edit bootstrap). Tak sentuh `domain/**`, `skema/**`.
- BMKG: **cache-only**, atribusi wajib, fail-soft, disclaimer keselamatan. Modul ber-gate `CUACA_AKTIF` — kalau mati, halaman destinasi tetap normal.
- Semua query terfilter `desa_id`; lintas-tenant → 404.

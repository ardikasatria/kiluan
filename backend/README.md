# B1 — Balai Warga (Auth & RBAC multi-tenant)

State backend setelah B1: **async end-to-end** (ADR-0003), keamanan produksi
argon2+JWT, `repo/sql.py` async, dan router `/auth/*`, `/saya`, keanggotaan tenant,
serta `/peran` `/kategori`. Menggabung B0 (infra + migrasi bootstrap).

## Apa yang berubah dari scaffold F0

**Porting async (sekali, sesuai ADR-0003).** `repo/memori.py`, `layanan/*`, dan
`domain.konteks.bangun_konteks` kini `async`. **Logika domain tak berubah** —
hanya `async/await`. `pytest -q` → **27 passed** (+1 skipped integrasi) membuktikan
porting tidak merusak perilaku.

**Keamanan produksi di-inject.** `app/inti/keamanan.py` (argon2 + JWT HS256) punya
tanda tangan fungsi identik dengan `app/domain/keamanan.py` (pbkdf2 + HMAC).
`AuthLayanan(store, keamanan=inti.keamanan)` dipakai di endpoint; unit test tetap
memakai domain murni (bebas dependensi berat). Domain tetap infra-free.

**Repo SQL (`app/repo/sql.py`).** Async SQLAlchemy untuk slice Auth
(pengguna/desa/keanggotaan/token/referensi), tanda tangan 1:1 dengan `memori.py`.
Pola: `ambil*` mengembalikan **baris ORM attached** → mutasi in-place service
ter-persist saat commit (semantik sama dengan in-memory). Enum domain = `str`-subclass
sehingga perbandingan/assignment bekerja tanpa konversi. Keanggotaan memakai hybrid
`peran` (kode ↔ `peran_id`) di `model/tabel.py`.

## Endpoint (materialisasi terverifikasi via OpenAPI)

```
POST /api/v1/auth/daftar | verifikasi-email | masuk | segarkan | keluar | lupa-sandi | reset-sandi
GET  /api/v1/saya            GET /api/v1/saya/keanggotaan
POST /api/v1/desa/{slug}/keanggotaan     GET (kelola)     PATCH /{id} (putuskan)
GET  /api/v1/peran           GET /api/v1/kategori
GET  /api/v1/sehat
```
- Refresh token: cookie `HttpOnly; Secure; SameSite=Lax` (path `/api/v1/auth`), rotasi tiap `/segarkan`, reuse → cabut semua sesi.
- Rate limit `/auth/masuk`: 5/menit/IP (Redis) → 429.
- Email dev: tautan verifikasi/reset muncul di log backend (`kiluan.email`).
- Dependency: `resolusi_desa(slug)` (404 bila tak ada), `wajib_peran(aksi)` (RBAC + tenant), `konteks_saat_ini`.

## Menjalankan

```bash
cd deploy && docker compose up -d --build     # migrasi bootstrap + uvicorn
# smoke:
curl -X POST http://localhost/api/v1/auth/daftar \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@contoh.id","nama":"A","kata_sandi":"rahasia123"}'
# token verifikasi tampil di: docker compose logs backend
```

Unit test (tanpa DB): `cd backend && pytest -q`.

## Gerbang B1

- **Unit (in-memory, hijau di mana saja):** siklus auth + rotasi + reuse-cabut; RBAC
  (wisatawan 403, admin global lolos); lintas-tenant 404; validasi. → `27 passed`.
- **Integrasi (perlu Postgres uji):** `tests/integrasi/test_sql_auth.py`, jalan bila
  `TEST_DATABASE_URL` diset — membuktikan mutasi-via-ORM ter-persist, unik→Konflik,
  filter tenant nyata.
- **E2E (perlu stack):** smoke daftar→(log token)→verifikasi→masuk→/saya; `/auth/masuk`
  ke-6 dalam semenit → 429.

## Batas verifikasi (jujur)

Repo SQL + endpoint sudah lolos `py_compile`, impor, dan materialisasi OpenAPI, tetapi
**belum dijalankan terhadap Postgres nyata di sini** (tak ada DB di lingkungan ini).
Gerbang sebenarnya = test integrasi + smoke E2E di mesinmu. Titik yang paling perlu
dikonfirmasi: semantik **mutasi-via-baris-ORM** (verifikasi email, rotasi/cabut refresh)
benar ter-commit. Bila ada yang meleset, kirim errornya.

## Berikutnya (B2)

`repo/sql.py` +Repo destinasi/layanan/kalender (PostGIS `ST_DWithin`), router destinasi
(CRUD + `/status` + soft-delete + cari geo), mengikuti pola mapping yang sama.

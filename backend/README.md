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

Unit test (tanpa DB): `cd backend && pytest -q` → **109 passed, 4 skipped** (F0–F2).

### Integrasi Postgres/PostGIS (F2)

Butuh **PostGIS** (image `postgis/postgis:16-3.4` seperti `deploy/docker-compose.yml`):

```bash
# Buat DB uji sekali (contoh lokal):
createdb kiluan_test
psql kiluan_test -c "CREATE EXTENSION postgis;"

export TEST_DATABASE_URL="postgresql+asyncpg://USER:PASS@localhost:5432/kiluan_test"
cd backend && pytest tests/integrasi -q
```

| Berkas | Gerbang |
|--------|---------|
| `test_sql_auth.py` | Auth ORM persist |
| `test_sql_checkout.py` | Race slot `FOR UPDATE` → satu sukses, satu `409` |
| `test_sql_f2_e2e.py` | Checkout → bayar manual → check-in → rilis → payout |
| `test_sql_f2_escrow.py` | CHECK `ck_transaksi_split` menolak baris tidak seimbang |
| `test_sql_f2_penjelajah.py` | `ST_DWithin` geofence, belajar→aksi, isolasi tenant |

Tanpa `TEST_DATABASE_URL`, integrasi **di-skip** — unit memori tetap hijau.

### Penutup F2 — ADR

Keputusan arsitektur F2: `docs/adr/ADR-0009` … `ADR-0012` (migrasi front-loaded, kontrak escrow/webhook, diskon escrow, model Pemandu lokal hardcode).

## Batas verifikasi (jujur)

Unit + scaffold F2 (`tests/f2/`) hijau tanpa DB. Integrasi & E2E SQL membutuhkan Postgres/PostGIS di mesin Anda — jalankan perintah di atas sebelum go-live thin-slice PkM.

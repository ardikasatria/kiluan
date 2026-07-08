# B0 — Bootstrap (titik mulai konkret untuk Cursor)

Bundel ini melengkapi **Langkah B0/F0** dari brief F0: infra Docker, migrasi Alembic
bootstrap 13 tabel + seed, konfigurasi backend, dan health check. Digabung dengan
**scaffold** (`domain/` + `skema/` + `layanan/` + `repo/memori.py` + `model/tabel.py`)
yang sudah teruji.

## Cara menggabung ke repo

Struktur kamu: `backend/`, `frontend/`, `deploy/`. Salin isi bundel:

```
b0-bootstrap/backend/*   →  backend/          (Dockerfile, requirements, alembic*, app/inti, app/main.py)
b0-bootstrap/deploy/*    →  deploy/           (docker-compose.yml, .env.contoh, nginx/)
b0-bootstrap/docs/*      →  backend/docs/ atau docs/   (ADR-0003)
```

Pastikan **scaffold** sudah ada di `backend/app/{domain,skema,layanan,repo,model}`
(dari `kiluan-backend`). Setelah merge, pohon `backend/app/` minimal:

```
app/
  domain/  skema/  layanan/  repo/memori.py  model/tabel.py   # dari scaffold
  inti/{konfig.py,db.py}                                       # dari bundel B0
  main.py                                                      # dari bundel B0
```

## Jalankan (dev)

```bash
cd deploy
cp .env.contoh .env      # ubah kredensial
docker compose up -d --build
```

Urutan: `db`/`redis`/`minio` sehat → `minio-init` membuat bucket → `backend`
menjalankan `alembic upgrade head` lalu `uvicorn`. Cek:

```bash
curl http://localhost/api/v1/sehat        # {"status":"ok","db":true}
curl http://localhost:8000/api/v1/sehat   # langsung (tanpa nginx)
```

## Gerbang penerimaan B0

- `alembic upgrade head` sukses membuat 13 tabel + ekstensi PostGIS + indeks GIST.
- `alembic downgrade base` bersih (rollback tanpa error).
- Seed terisi: `peran` 8 baris, `kategori` 5, `desa` `teluk-kiluan` (`status=aktif`),
  akun `admin` + keanggotaan global admin.
- `GET /api/v1/sehat` → 200 `{"status":"ok"}`.
- `cd backend && pytest -q` tetap **hijau** (unit scaffold tak tersentuh).
- (F0/frontend) Lighthouse PWA **installable**; shell termuat offline.

## Keputusan tertanam

- **ADR-0003 (async):** app FastAPI + SQLAlchemy **async**; migrasi Alembic
  **sinkron** (`DATABASE_URL_SYNC` via psycopg). Karena itu ada dua URL DB di `.env`.
- **Enum via CHECK**, bukan ENUM native → mudah menambah nilai di fase lanjut tanpa
  migrasi berat.
- **PostGIS Geography(4326)** + indeks **GIST** untuk `desa.lokasi`, `destinasi.lokasi/area`.
- **RLS belum dinyalakan** (baru F4). `resolusi_desa` (B1) sudah menyiapkan `app.desa_id`.

## Catatan porting async (dikerjakan mulai B1)

`requirements.txt` sudah menyertakan `pytest-asyncio`. Di B0 service scaffold masih
sinkron dan test hijau apa adanya. Konversi service/repo/test ke async mengikuti
**resep di ADR-0003** dilakukan saat B1 (mekanis, tidak menyentuh logika domain).

## Catatan verifikasi

Migrasi sudah lolos `py_compile` + impor (tipe geoalchemy2/SQLAlchemy valid). Gerbang
sebenarnya = `alembic upgrade head` terhadap Postgres compose pada boot pertama —
jalankan itu sebagai konfirmasi akhir sebelum lanjut B1.

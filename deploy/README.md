# Deploy Kiluan — Docker VM (produksi / staging)

Stack lengkap: **PostGIS · Redis · MinIO · Backend (FastAPI) · Frontend (Next.js) · Nginx**.

Satu port publik (**80**): situs di `/`, API di `/api/v1/*` (same-origin, cocok untuk auth B1).

## Prasyarat VM

- Docker Engine 24+ & Docker Compose v2
- RAM minimal **2 GB** (disarankan 4 GB untuk build frontend)
- Port **80** terbuka di firewall

## Mulai cepat

```bash
cd deploy
cp .env.contoh .env
```

Edit `.env`:

1. Ganti `<IP-VM>` di `APP_BASE_URL` dan `CORS_ORIGINS` (mis. `http://203.0.113.10`)
2. Ganti semua password & `JWT_SECRET`
3. Opsional: `CUACA_AKTIF=true` untuk modul cuaca BMKG

```bash
docker compose --env-file .env up -d --build
```

Build pertama bisa **5–15 menit** (terutama frontend).

## Cek kesehatan

```bash
# dari VM
curl http://localhost/api/v1/sehat
# {"status":"ok","db":true}

chmod +x scripts/smoke.sh
./scripts/smoke.sh http://localhost
```

Dari browser (ganti IP):

- Beranda: `http://<IP-VM>/`
- Desa: `http://<IP-VM>/teluk-kiluan`
- API: `http://<IP-VM>/api/v1/sehat`

## Login admin

Setelah migrasi bootstrap, gunakan kredensial dari `.env`:

- Email: `ADMIN_EMAIL` (default `admin@kiluan.local`)
- Sandi: `ADMIN_SANDI_AWAL`

Verifikasi email: cek log backend untuk token (mode `EMAIL_PROVIDER=dev`):

```bash
docker compose logs backend | grep EMAIL-DEV
```

## Perintah berguna

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose down          # stop
docker compose down -v       # stop + hapus volume DB (hati-hati!)
```

## Struktur

```
deploy/
  docker-compose.yml    # stack lengkap
  .env.contoh           # template environment
  nginx/nginx.conf      # reverse proxy :80
  scripts/smoke.sh      # uji cepat HTTP
```

## TLS / HTTPS (setelah uji HTTP OK)

1. Pasang sertifikat (certbot / reverse proxy eksternal)
2. Set `COOKIE_SECURE=true` di `.env`
3. Tambahkan `https://...` ke `CORS_ORIGINS`
4. Update `APP_BASE_URL` ke `https://kiluan.sainsdataciv.com`

## Troubleshooting

| Gejala | Solusi |
|--------|--------|
| `minio` unhealthy | `docker compose logs minio` — pastikan `MINIO_ROOT_PASSWORD` ≥ 8 karakter; pull ulang compose terbaru (healthcheck pakai `mc ready`, bukan `wget`) |
| `backend` restart loop | `docker compose logs backend` — cek koneksi DB & migrasi |
| Frontend 502 | Tunggu healthcheck hijau: `docker compose ps` |
| Login gagal / cookie | Pastikan `CORS_ORIGINS` mencakup URL browser; `COOKIE_SECURE=false` untuk HTTP |
| Build frontend OOM | Tambah swap di VM atau build di mesin lain lalu push image |

## Port internal

Hanya **nginx (:80)** yang diekspos ke host. Postgres, Redis, MinIO, backend, dan frontend hanya di jaringan Docker `kiluan`.

# Deploy sigerciv — Docker VM (produksi / staging)

Stack: **PostGIS · Redis · MinIO · Backend · Frontend · Caddy** (TLS otomatis).

**Arsitektur URL (produksi):**

| Host | Peran |
|------|--------|
| `https://sigerciv.com` | Frontend Next.js |
| `https://api.sigerciv.com` | API FastAPI (`/api/v1/*`) |
| `https://api.sigerciv.com/media/` | MinIO (unggah & baca media) |

Frontend memanggil API lewat `NEXT_PUBLIC_API_URL` (bukan `/api` same-origin).

## Prasyarat VM

- Docker Engine 24+ & Docker Compose v2
- RAM minimal **2 GB** (disarankan 4 GB untuk build frontend)
- Port **80** dan **443** (TCP) terbuka di firewall; **443/udp** opsional (HTTP/3)
- DNS sudah mengarah ke IP VM **sebelum** `docker compose up` pertama:
  - `sigerciv.com` → IP VM
  - `api.sigerciv.com` → IP VM

## Mulai cepat

```bash
cd deploy
cp .env.contoh .env
nano .env
```

Edit `.env` (minimal):

1. `ACME_EMAIL` — email valid untuk Let's Encrypt
2. `FRONTEND_DOMAIN` / `API_DOMAIN` — sesuaikan jika perlu
3. `APP_BASE_URL` = URL frontend (`https://sigerciv.com`)
4. `NEXT_PUBLIC_API_URL` = URL API (`https://api.sigerciv.com`)
5. `CORS_ORIGINS` harus mencakup origin **frontend**
6. Ganti semua password & `JWT_SECRET`
7. `COOKIE_SECURE=true` (default; Caddy selalu HTTPS)
8. `MINIO_PUBLIC_BASE_URL` + `MINIO_SECURE=true` untuk unggah media F4

```bash
docker compose --env-file .env up -d --build --remove-orphans
```

Build pertama bisa **5–15 menit** (terutama frontend). Caddy meminta sertifikat Let's Encrypt otomatis saat container pertama kali jalan (~30–90 detik setelah DNS aktif).

## Cek kesehatan

```bash
# API (subdomain)
curl -fsS https://api.sigerciv.com/api/v1/sehat

# Frontend
curl -I https://sigerciv.com/

chmod +x scripts/smoke.sh
./scripts/smoke.sh https://sigerciv.com https://api.sigerciv.com
```

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
docker compose logs -f caddy
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
  caddy/Caddyfile       # reverse proxy + TLS otomatis
  scripts/smoke.sh      # uji cepat HTTP(S)
```

## TLS / HTTPS

**Tidak perlu certbot.** Caddy meminta dan memperpanjang sertifikat Let's Encrypt otomatis untuk `FRONTEND_DOMAIN` dan `API_DOMAIN`.

Sertifikat disimpan di volume Docker `caddy_data` (tetap ada setelah restart).

Pastikan:

1. Port 80 & 443 dari internet bisa dijangkau VM (ACME HTTP-01 + TLS)
2. `ACME_EMAIL` terisi di `.env`
3. Kedua A record DNS sudah resolve ke IP VM

```bash
docker compose logs -f caddy   # pantau penerbitan sertifikat
```

## Troubleshooting

| Gejala | Solusi |
|--------|--------|
| `Bind for 0.0.0.0:80 failed: port is already allocated` | Port 80/443 masih dipakai. Jalankan `./scripts/preflight.sh`. Hentikan service lama: `docker compose down --remove-orphans` (hapus container **nginx** lama), lalu `sudo systemctl stop nginx apache2 caddy` bila ada di host. Caddy **wajib** pakai 80 & 443 untuk TLS otomatis. |
| Caddy gagal TLS / ACME error | Pastikan DNS sudah aktif; port 80/443 terbuka; cek `docker compose logs caddy` |
| `subject does not qualify for certificate: '{env.API_DOMAIN}'` | Caddyfile salah pakai `{env.VAR}` di alamat site — harus `{$VAR}` (sudah diperbaiki di repo). Pastikan `.env` berisi `API_DOMAIN` & `FRONTEND_DOMAIN`. Lalu `docker compose up -d --force-recreate caddy` |
| `minio` unhealthy | `docker compose logs minio` — pastikan `MINIO_ROOT_PASSWORD` ≥ 8 karakter |
| `backend` restart loop | `docker compose logs backend` — cek koneksi DB & migrasi |
| Frontend 502 | Tunggu healthcheck hijau: `docker compose ps` |
| Login gagal / cookie | `CORS_ORIGINS` harus origin **frontend**; `COOKIE_SECURE=true`; API di `api.sigerciv.com` |
| Build frontend OOM | Tambah swap di VM atau build di mesin lain lalu push image |

## Port internal

Hanya **Caddy (:80, :443)** yang diekspos ke host. Postgres, Redis, MinIO, backend, dan frontend hanya di jaringan Docker `kiluan`.

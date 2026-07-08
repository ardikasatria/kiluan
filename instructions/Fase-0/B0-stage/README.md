# B0-stage — artefak bootstrap Fase 0

Folder ini berisi **rujukan & bundel** untuk B0. Titik deploy aktif ada di **`deploy/`** di root repo.

## Struktur

```
B0-stage/
  b0-bootstrap/          # bundel sumber (salin ke repo saat setup awal)
    backend/             # potongan backend B0 (Dockerfile, alembic, inti, main)
    deploy/              # template compose + nginx + .env
    docs/adr/            # ADR-0003 async vs sync
    README.md
  0001_bootstrap_f0.py # salinan migrasi (referensi)
  ADR-0003-async-vs-sync.md
```

## Yang sudah digabung ke repo

| Dari bundel | Ke repo |
|---|---|
| `b0-bootstrap/backend/*` | `backend/` (Dockerfile, alembic, `app/inti`, `app/main.py`) |
| `b0-bootstrap/deploy/*` | **`deploy/`** |
| `b0-bootstrap/docs/adr/*` | `docs/adr/` |

Scaffold domain (`app/domain`, `skema`, `layanan`, `repo/memori`, `model/tabel`) tetap di `backend/app/` dari `instructions/kiluan-backend`.

## Deploy

```bash
cd deploy
cp .env.contoh .env
docker compose --env-file .env up -d --build
```

File `docker-compose.yml` di level ini (jika ada) adalah salinan lama — gunakan **`deploy/docker-compose.yml`** di root repo.

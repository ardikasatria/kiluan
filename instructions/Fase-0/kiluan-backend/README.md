# Kiluan — Scaffold Backend Fase 0

Scaffold **Python murni** untuk Fase 0 (Balai Warga · Gerbang · Destinasi Kiluan).
Mengikuti pola PSD: *scaffold + `pytest` hijau dulu, baru brief Cursor*. Logika
domain diuji **tanpa Postgres/PostGIS** lewat repo in-memory yang tenant-aware,
sehingga gerbang test bisa hijau di mana saja sebelum diwujudkan ke stack nyata.

## Jalankan test

```bash
pip install -r requirements.txt
pytest -q
```

Hasil: **27 passed**. Tak butuh DB, Redis, atau MinIO.

## Struktur

```
app/
  domain/       # inti bebas-infrastruktur (bisa diuji sendiri)
    enums.py        # semua enum F0 (nilai persis ERD)
    errors.py       # KesalahanDomain → kode+http amplop error kontrak
    geo.py          # haversine (pengganti PostGIS ST_DWithin di uji)
    rbac.py         # matriks (peran × aksi) F0
    konteks.py      # Konteks permintaan + boleh()/wajib()
    keamanan.py     # hash sandi (pbkdf2), hash token, access token HMAC
    paginasi.py     # keyset cursor generik
    entitas.py      # dataclasses baris (untuk repo in-memory)
    util.py         # uid(), urut() (surrogate UUIDv7)
  skema/        # DTO Pydantic v2 (validasi gate)
    umum.py         # Lokasi, MetaPaginasi, AmplopGalat
    destinasi.py    # DaftarReq, MasukReq, DestinasiBuat/Ubah
  repo/
    memori.py       # repo in-memory tenant-aware + ObjectStore palsu (MinIO)
  layanan/      # service layer (aturan bisnis + RBAC + tenant)
    auth.py         # daftar/verifikasi/masuk/segarkan/keluar/reset
    keanggotaan.py  # ajukan/kelola/putuskan peran
    destinasi.py    # CRUD + status + soft delete + cari (geo/keyset)
    media.py        # presign/konfirmasi + lampiran (utama tunggal)
    discovery.py    # layanan wisata (ownership) + discovery lintas-desa
  model/
    tabel.py        # SQLAlchemy 2.0 — sumber skema Alembic (referensi, tak diuji)
tests/            # gerbang pytest F0
```

## Pemetaan test → gerbang `pytest` F0 (Kontrak API §9)

| Berkas test | Gerbang yang ditutup |
|---|---|
| `test_auth.py` | siklus daftar→verifikasi→masuk→segarkan(rotasi)→keluar; token sekali-pakai; **reuse refresh mencabut semua sesi**; pending→403; email duplikat→409; reset sandi |
| `test_rbac.py` | wisatawan gagal buat/publikasi; pengelola boleh; **admin global lolos scope**; anonim ditolak |
| `test_isolasi_tenant.py` | resource desa lain → **404 (bukan 403)**; cari terfilter `desa_id`; slug resolusi dalam scope desa |
| `test_destinasi.py` | unik `(desa_id, slug)`→409; **soft delete** hilang dari publik; draft hanya terlihat pengelola; validasi Pydantic lokasi/slug |
| `test_geo_media_paginasi.py` | radius benar + `jarak_m` terurut; presign→konfirmasi (tolak tanpa objek MinIO); **`utama` tunggal** per entitas; **keyset stabil** saat data disisipkan |

## Batas sadar scaffold (dijelaskan di brief Cursor B0)

- **Geo**: haversine murni-Python menggantikan PostGIS `ST_DWithin`+GIST. Model
  `app/model/tabel.py` sudah memakai `Geography(POINT,4326)` untuk implementasi nyata.
- **Keamanan**: pbkdf2 + access token HMAC (stdlib) menggantikan argon2 + JWT.
  Perilaku yang diuji (rotasi, kedaluwarsa, deteksi reuse) identik.
- **Persistensi**: repo in-memory menggantikan SQLAlchemy+Postgres. Kontrak metode
  repo sengaja tipis agar 1:1 saat dipetakan ke implementasi async SQLAlchemy.
- **Rate limit** (Redis) & alur email nyata belum di-scaffold — tercatat sebagai
  TODO brief B1.

## Langkah berikutnya

Brief Cursor **B0/F0 … B4/F4** (backend+frontend berpasangan), tiap brief dibuka
**"Langkah 0 — Orientasi repo"**. Model `tabel.py` + kontrak API jadi rujukan
migrasi Alembic bootstrap dan endpoint FastAPI.

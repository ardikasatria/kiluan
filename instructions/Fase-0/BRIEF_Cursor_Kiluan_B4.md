# Brief Cursor — B4/F4: Media MinIO + Galeri (penutup F0)

**Prasyarat:** B0–B3 hijau. Stack async. **Rujukan:** `KONTRAK_API §5.4–5.5`, repo `backend/` pasca-B3.
**Pola:** `layanan/media.py` (service sudah async & teruji), `sql.py` (mapping ORM↔domain), `inti/email.py` (adapter eksternal ber-antarmuka), `inti/konfig.py` (setelan MinIO sudah ada dari B0).

## Langkah 0 — Orientasi repo (WAJIB)
Baca `KONTRAK_API §5.4–5.5` (media presigned + lampiran polimorфik). Cek setelan MinIO di `.env`/`konfig.py` + bucket dibuat `minio-init` (compose B0). `pytest -q` hijau. **Jangan** ubah `domain/**`, `skema/**`. Ringkas file yang disentuh + risiko.

---

## B4 backend — Media & Lampiran

Service `MediaLayanan` (presign/konfirmasi/tempel/set_utama) **sudah async & teruji**; `utama` tunggal per entitas dijaga service. Yang kurang: repo SQL + adapter MinIO nyata + router.

1. **`app/inti/minio.py`** — adapter async menggantikan `ObjectStorePalsu`, antarmuka sama: `presign_put(objek)->url`, `ada(objek)->bool`. Pakai SDK `minio` (sinkron) via `anyio.to_thread`, atau presign S3 langsung. Bucket dari `MINIO_BUCKET`. **Presigned PUT** (klien unggah langsung ke MinIO, tak lewat backend).
2. **`app/repo/sql.py` +** `RepoMediaSQL/LampiranSQL` (tanda tangan 1:1 `memori.py`; pola mapping seperti Auth). Tambah ke `Penyimpanan`. `media.objek_minio` unik → `Konflik`.
3. **Router** (`app/api/media.py`, Kontrak §5.4–5.5):
   - `POST /desa/{slug}/media/presign` → `{media_id, objek_minio, url_unggah, kedaluwarsa_dalam}`.
   - `POST /desa/{slug}/media/konfirmasi` → verifikasi objek ada di MinIO, set `url`+metadata (tolak `422` bila objek belum diunggah).
   - `GET/DELETE /desa/{slug}/media/{id}`.
   - `POST /desa/{slug}/lampiran` (tempel: `media_id,entitas_tipe,entitas_id,urutan,utama`), `PATCH /{id}` (set `utama`/`urutan`), `DELETE /{id}`.
   - `wajib_peran(UNGGAH_MEDIA / KELOLA_LAMPIRAN)`.
4. **Integrasi ke detail (B3):** isi `media[]` (urut, `utama`) pada DTO detail destinasi/desa — ganti placeholder `[]`.
5. **Lifecycle** MinIO untuk file "yatim" (di-PUT tapi tak dikonfirmasi) — kebijakan expiry bucket.
6. **Gerbang:** unit lama hijau (termasuk media/lampiran + `utama` tunggal); integrasi presign→PUT→konfirmasi valid; konfirmasi tanpa objek → 422; media desa lain → 404.

---

## F4 frontend — Uploader & Galeri (PWA)

Langkah 0 dulu. Lalu:
- **Uploader dua-langkah**: `presign` → `PUT` biner langsung ke MinIO (progress) → `konfirmasi` metadata; retry saat offline.
- **Galeri per entitas**: urutkan, set sampul (`utama`), hapus (lepas lampiran). Pakai di form destinasi/layanan (dashboard pengelola) & tampil di halaman spot publik (galeri B3).
- **Gerbang:** unggah besar via presigned jalan tanpa membebani backend; sampul (`utama`) tampil sebagai foto utama; hapus melepas lampiran.

---

## Guardrails
- Presigned = unggah langsung ke MinIO (jangan proxy biner lewat backend). Atur `client_max_body_size` nginx hanya untuk request non-biner.
- `utama` tunggal per entitas (sudah dijaga service — jangan duplikasi logika di router).
- Semua query terfilter `desa_id`; media/lampiran lintas-tenant → 404.
- Tak sentuh `domain/**`/`skema/**`; perubahan skema (bila ada) via Alembic increment.

---

## Penutup F0 (setelah B4 hijau)
1. Jalankan **seluruh gerbang `pytest §9`** (unit + integrasi) + smoke E2E full: daftar→verifikasi→masuk→buat destinasi→unggah media→publikasi→muncul di `/[desa]/spot/[id]`.
2. **Lighthouse PWA installable** + shell offline.
3. Isi **seed nyata**: ≥10 spot Kiluan + layanan + media → luaran wajib "platform aktif dapat diakses publik".
4. Aktifkan email produksi (`EMAIL_PROVIDER=resend_api` + verifikasi domain) & modul Cuaca (`CUACA_AKTIF`) bila siap.
5. Lanjut siklus **F1**: turunkan Kontrak API F1 → scaffold+pytest → brief B5…. (ALTER F0: `layanan.umkm_id`, perluasan `media_lampiran.entitas_tipe` via Alembic increment.)

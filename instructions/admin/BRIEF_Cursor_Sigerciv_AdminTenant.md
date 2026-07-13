# Brief Cursor — B/F-AdminTenant: Konsol Admin (Tenant · Provisioning · Konfigurasi)

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung. *(Mulai mengunci F4 Nusantara; sebagian MVP dibutuhkan sekarang untuk operasi multi-desa.)*
**Cakupan:** Admin/Steward global — **kelola tenant desa** (lifecycle), **provisioning/onboarding**, **tema white-label + domain**, **konfigurasi platform** (referensi global + feature flags), **ekspor data komunitas**, **kesehatan sistem**. Design-first, **berpasangan B/F**.
**Mode:** **Next.js web murni (belum PWA)**. i18n via katalog.
**Prasyarat:** F0–F2 hijau; peran `admin` global. **Belum ada `KONTRAK_API_Fase4`** → brief ini menurunkannya dari `ERD_Fase4`.
**Rujukan:** `ERD_Fase4 (tema_desa, domain_desa, onboarding_desa/langkah, ekspor_data, langganan_desa, log_audit)`, `ERD_Fase0 §3.1 desa`, `KONTRAK_API_Fase0 §1 (RBAC, amplop error)`.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `backend/`: pola repo async + in-memory, Alembic increment, RBAC guard (`wajib_peran`), amplop error, tabel `desa`/`pengaturan_desa`. Baca `frontend/`: shell dashboard + konteks peran, pemilih desa (reuse), i18n, klien API. Ringkas file disentuh + risiko. **Jangan** ubah skema lama; increment F4 baru.

---

## Aturan keamanan admin (WAJIB)

- Semua `/admin/*` butuh peran **`admin` global**; lainnya → 403.
- **Aksi sensitif ditulis ke `log_audit`** (`sebelum`/`sesudah` jsonb + `ip`): provisioning, ubah tema/domain, ekspor, ubah konfigurasi, nonaktifkan desa.
- **Field sensitif tak pernah tampil** (kata_sandi_hash, token, `pembayaran.mentah`, konfig gateway rahasia, nomor rekening penuh).
- **Aksi destruktif** (nonaktif desa, hapus) → konfirmasi eksplisit + alasan (tercatat). **Impersonasi pengguna sengaja TIDAK disertakan** (risiko) — bila kelak dibutuhkan, rancang terpisah dengan audit ketat.

---

## Rancang (kunci sebelum kode) — kontrak admin (turunan F4)

### Tenant desa (lifecycle)
- `GET /admin/desa?status=&q=` · `POST /admin/desa` (buat `status=draft`) · `PATCH /admin/desa/{slug}` · `PATCH /admin/desa/{slug}/status {status: draft|aktif|nonaktif}`.
- Buat desa → seed `onboarding_desa` + `onboarding_langkah` (kode: `profil|tema|seed_konten|verifikasi_pokdarwis|pengaturan_reinvestasi|go_live`).

### Provisioning / onboarding
- `GET /admin/desa/{slug}/onboarding` · `PATCH .../onboarding/langkah/{kode} {status: belum|selesai|dilewati}`; `progres` diturunkan. `go_live` hanya boleh bila langkah kritis selesai (mis. `verifikasi_pokdarwis`, `pengaturan_reinvestasi`).

### Tema white-label & domain
- `GET/PUT /admin/desa/{slug}/tema` (warna, logo, favicon, hero, font, tagline, `ekstra` jsonb). `desa.warna_primer/logo` = fallback.
- `GET/POST /admin/desa/{slug}/domain` · `POST .../domain/{id}/verifikasi` (`dns_txt`/`cname` + token) · set `utama` tunggal.

### Konfigurasi platform
- **Referensi global CRUD:** `/admin/referensi/{kategori|bidang-usaha|kartu-aksi|hadiah|peran|badge|aturan-poin}` (yang kini di-seed → jadikan terkelola).
- **Feature flags (tabel baru `konfigurasi_platform` — flag):** `gateway_aktif`, `llm_pemandu_aktif`, `locale_tersedia[]`, default `persen_fee`, dsb. `GET/PATCH /admin/konfigurasi`.

### Ekspor data komunitas & langganan
- `POST /admin/desa/{slug}/ekspor {format: json|csv|parquet}` → `ekspor_data` (antri→…→selesai; bundle MinIO, kedaluwarsa). **Hanya data ber-`desa_id` desa itu; tak bocor desa lain.**
- `GET/PUT /admin/desa/{slug}/langganan {model: gratis|disubsidi|mandiri}`.

### Kesehatan sistem
- `GET /admin/kesehatan` → status DB/Redis/MinIO/BMKG/email/gateway + ringkas job.

### Gerbang pytest (in-memory → SQL, dependensi eksternal di-mock)
Hanya admin akses (lain 403); buat desa → onboarding ter-seed; `go_live` terblokir bila langkah kritis belum; **ekspor hanya data desa itu** (isolasi tenant terbukti); domain `utama` tunggal + verifikasi token; feature flag terbaca service; **`log_audit` terisi** untuk tiap aksi sensitif; field sensitif tak keluar.

---

## Scaffold + pytest (WAJIB sebelum frontend)

`layanan/admin_tenant.py` + repo in-memory → hijaukan gerbang. Lalu Alembic increment F4 (`konfigurasi_platform` + tabel F4 yang dipakai) + repo SQL. Frontend tak konsumsi sebelum hijau.

---

## Frontend — `/admin/*` (khusus admin)

Konsol terpisah dari dashboard desa. Nav: **Desa**, **Provisioning**, **Tema & Domain**, **Konfigurasi**, **Ekspor**, **Kesehatan**.

- **Desa:** tabel tenant (status, GMV ringkas opsional) → detail; buat desa (form profil) → wizard onboarding (checklist langkah + progres); tombol aktif/nonaktif (konfirmasi + alasan).
- **Tema & Domain:** editor tema (live preview warna/logo/hero) + kelola domain (tambah, tampilkan instruksi DNS `dns_txt`/`cname`, tombol verifikasi, tandai utama).
- **Konfigurasi:** editor referensi global (kategori/bidang/kartu/hadiah/peran) + panel **feature flags** (toggle gateway, LLM Pemandu, locale). Perubahan berdampak luas → konfirmasi.
- **Ekspor:** minta ekspor per desa (format), lacak status, unduh bundle. Bingkai sebagai **kepemilikan data komunitas** (platform = penatalayan).
- **Kesehatan:** kartu status layanan + job.

---

## Gerbang (uji frontend — web)

- **Guard:** hanya admin melihat `/admin/*`; lainnya 403/redirect.
- **Lifecycle desa:** buat → wizard onboarding; `go_live` terkunci sampai langkah kritis selesai; aktif/nonaktif minta konfirmasi+alasan.
- **Tema/domain:** preview tema; instruksi DNS tampil; verifikasi + utama tunggal.
- **Ekspor:** minta→lacak→unduh; framing kepemilikan komunitas.
- **Feature flags:** toggle tercermin (mis. gateway off → UI checkout tetap manual).
- **Sensitif tersembunyi; audit tercatat** (tampil di viewer audit brief B/F-AdminModerasi); i18n; a11y axe bersih.

---

## Batas / scope jujur

Ini **F4 Nusantara** — di luar deliverable realistis PkM (F0+F1+thin-F2). **MVP sekarang:** lifecycle desa + konfigurasi + kesehatan. **Fase lanjut:** provisioning **self-service** penuh, domain kustom otomatis, pipeline ekspor besar, `jaringan_desa` (marketplace lintas-desa). Moderasi/pengguna/audit-viewer → **brief B/F-AdminModerasi**. Offline → tak relevan (konsol admin desktop-first).

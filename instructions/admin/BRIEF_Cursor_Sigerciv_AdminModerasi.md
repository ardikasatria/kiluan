# Brief Cursor — B/F-AdminModerasi: Konsol Admin (Moderasi · Pengguna · Audit)

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung. *(F4; sebagian MVP dibutuhkan sekarang.)*
**Cakupan:** Admin/Steward global — **moderasi konten lintas-desa**, **laporan/abuse**, **manajemen pengguna & peran global**, **penampil `log_audit`**, **oversight keuangan lintas-desa** (baca). Design-first, **berpasangan B/F**.
**Mode:** **Next.js web murni (belum PWA)**. i18n via katalog.
**Prasyarat:** F0–F2 hijau; peran `admin`; brief B/F-AdminTenant (namespace `/admin/*`, aturan keamanan admin, `log_audit`).
**Rujukan:** `ERD_Fase4 (log_audit)`, `KONTRAK_API_Fase0 §1 & §6 (RBAC)`, endpoint konten F0–F2 (destinasi/umkm/produk/paket/kontribusi/ulasan).

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `backend/`: RBAC guard, soft-delete/status konten yang ada, `log_audit`, amplop error. Baca `frontend/`: konsol `/admin/*` (brief AdminTenant), `<PanelKeputusan>` (F-Kurasi), tabel keyset, i18n. Ringkas file disentuh + risiko. **Jangan** duplikasi panel keputusan; **jangan** buat endpoint konten baru — moderasi bertindak atas yang sudah ada via scope global.

---

## Aturan keamanan admin (WAJIB — sama seperti AdminTenant)

Semua `/admin/*` = admin global; aksi sensitif (takedown, restore, suspend pengguna, ubah peran) **ditulis `log_audit`** (`sebelum`/`sesudah`+`ip`); field sensitif tak tampil; aksi destruktif butuh **alasan** (tercatat). Tanpa impersonasi.

---

## Rancang (kunci sebelum kode)

### Moderasi konten lintas-desa
Bertindak atas konten yang **sudah ada** dengan scope global:
- `GET /admin/moderasi/konten?tipe=&desa=&status=&q=` — daftar lintas-desa (`tipe`: destinasi/umkm/produk/paket/kontribusi/ulasan).
- `POST /admin/moderasi/{tipe}/{id}/takedown {alasan}` → set status `arsip`/`ditolak`/soft-delete (per tipe) + `log_audit`.
- `POST /admin/moderasi/{tipe}/{id}/pulihkan {alasan}` → kembalikan.

### Laporan / abuse (tabel baru `laporan` — flag)
- `id, pelapor_id|null (anonim boleh), entitas_tipe, entitas_id, desa_id, alasan (kode), catatan, status (masuk|ditinjau|ditindak|ditolak), penindak_id|null, dibuat_pada`.
- `POST /desa/{slug}/laporan` (publik/user — lapor konten) · `GET /admin/laporan?status=` · `POST /admin/laporan/{id}/transisi {aksi, catatan}` (**reuse `<PanelKeputusan>`**; menautkan ke takedown bila perlu).

### Manajemen pengguna & peran global
- `GET /admin/pengguna?status=&q=` (ringkas; **tanpa** field sensitif) · `GET /admin/pengguna/{id}` (+ keanggotaan lintas-desa).
- `PATCH /admin/pengguna/{id}/status {status: aktif|nonaktif|tersuspensi}` (+ alasan) — suspensi memblokir login.
- `POST/DELETE /admin/pengguna/{id}/peran {peran}` — beri/cabut peran **global** (`admin`/`kontributor`); peran scoped-desa tetap via keanggotaan desa.

### Audit & oversight
- `GET /admin/audit?aksi=&desa=&aktor=&dari=&sampai=` — penampil `log_audit` (keyset, read-only).
- `GET /admin/keuangan?desa=&periode=` — **baca** agregat GMV/transaksi/payout lintas-desa (oversight; uang tetap **otoritas per-desa** — admin tak mengoperasikan uang desa di sini).

### Gerbang pytest
Hanya admin (lain 403); takedown/pulihkan mengubah status yang benar per tipe + **`log_audit` terisi**; laporan: publik bisa lapor, admin transisi, isolasi tenant benar; suspensi pengguna memblokir login; beri/cabut peran global jalan; audit viewer keyset; oversight keuangan **read-only** (tak ada mutasi); field sensitif tak keluar.

---

## Scaffold + pytest (WAJIB sebelum frontend)

`layanan/admin_moderasi.py` (+ `laporan`) + repo in-memory → hijau. Lalu Alembic increment (`laporan`) + repo SQL. Frontend tak konsumsi sebelum hijau.

---

## Frontend — `/admin/*`

Nav tambahan: **Moderasi**, **Laporan**, **Pengguna**, **Audit**, **Keuangan**.

- **Moderasi:** tabel konten lintas-desa (filter tipe/desa/status/cari) → detail + **Takedown/Pulihkan** (alasan wajib, konfirmasi).
- **Laporan:** antrean laporan (reuse `<PanelKeputusan>`: tinjau→tindak/tolak + catatan), tautan ke konten terkait & aksi takedown.
- **Pengguna:** tabel pengguna (status, peran) → detail (keanggotaan lintas-desa); suspensi (alasan); beri/cabut peran global (konfirmasi).
- **Audit:** tabel `log_audit` (aktor, aksi, desa/global, waktu, diff `sebelum`/`sesudah`), filter. Read-only — bukti transparansi tata kelola.
- **Keuangan:** dashboard oversight lintas-desa (GMV, transaksi, payout) **baca**; angka Rupiah per locale; jelas ini oversight, bukan operasi.

---

## Gerbang (uji frontend — web)

- **Guard:** hanya admin; lainnya 403.
- **Moderasi:** takedown/pulihkan dengan alasan+konfirmasi; status konten berubah; tercermin ke publik.
- **Laporan:** lapor (user/anonim) → antrean admin → transisi via `<PanelKeputusan>`.
- **Pengguna:** suspensi memblokir (state jelas); beri/cabut peran global; keanggotaan lintas-desa tampil.
- **Audit:** riwayat + diff tampil; read-only.
- **Keuangan:** oversight read-only (tak ada tombol mutasi uang); Rupiah per locale.
- **Sensitif tersembunyi;** i18n; a11y axe bersih.

---

## Batas / scope jujur

**F4** — di luar PkM realistis. **MVP sekarang:** moderasi takedown + suspensi pengguna + audit viewer. **Fase lanjut:** sistem laporan penuh, analitik moderasi, aturan otomatis. Uang lintas-desa tetap **read-only** di admin (operasi = bendahara desa, F-DermagaKelola). Tenant/provisioning/konfigurasi → **brief B/F-AdminTenant**.

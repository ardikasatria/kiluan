# Brief Cursor — F-Kelola: Editor Pengelola Desa (Destinasi · Layanan · Kalender)

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung, di-tuning AI & sains data.
**Cakupan:** konsol kelola untuk **Pengelola Desa** — CRUD **destinasi** (+ geo, tag, galeri, status), **layanan**, **kalender aktivitas**. Tenant-scoped, generik untuk desa mana pun (bukan khusus satu kelompok).
**Peran (kapabilitas, bukan nama kelompok):** kelola penuh = `pokdarwis` / `perangkat_desa` / `admin` (matriks RBAC F0). *Catatan: "Pokdarwis" itu institusi standar nasional, jadi kode peran DB tetap valid; UI memakai label generik **"Pengelola Desa"**.*
**Mode:** **Next.js web murni (belum PWA)** — tanpa service worker/offline; entri lapangan offline ditunda ke fase PWA.
**Prasyarat:** F0 hijau; auth + shell dashboard (brief F-Dashboard) ada. Endpoint: destinasi/layanan/kalender/tag/kategori/media (Kontrak §5).
**Rujukan:** `KONTRAK_API_Fase0 §5 & §6 (RBAC) & §7 (DTO)`, brief B2/B4.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `frontend/`: shell dashboard + konteks desa/peran aktif (konsumsi, jangan definisikan ulang), komponen **peta** (Leaflet/MapLibre) & **galeri media presigned** (B4) yang sudah ada — reuse. Cek klien API + tipe DTO `Destinasi/Layanan/Kalender/Kategori/Tag/Media`, resolusi keyset, amplop error. Typecheck/lint hijau. Ringkas file disentuh + risiko. **Jangan** ubah util tenant/auth atau alur presigned.

---

## Rute & penempatan

Halaman kelola = isi konkret dashboard Pengelola Desa, **tenant-scoped**: `/[desa]/kelola/destinasi`, `/[desa]/kelola/layanan`, `/[desa]/kelola/kalender` (list + detail/form). `[desa]` = slug konteks aktif; dipakai langsung di path API. Guard: hanya peran kelola; non-pengelola → 403/redirect. Resource desa lain → 404 (konsisten kontrak).

---

## Editor Destinasi

List (keyset, filter status/kategori, termasuk `draft`/`arsip` untuk pengelola) → form buat/ubah.

Form: `nama`, `slug` (unik per desa — bentrok → tangani `409`), `kategori_id` (`GET /kategori`), `deskripsi`, `alamat`, `jam_operasional` (editor per-hari → jsonb).
**Geo (map picker, reuse):** `lokasi` **titik wajib** (`{lat,lng}`); `area` **poligon opsional** (zona konservasi/daya dukung — disiapkan untuk F3). Pinch/drag marker + gambar poligon.
**Tag:** tempel/lepas dari `GET /desa/{slug}/tag` (`POST .../{id}/tag {tag_id:[]}`, `DELETE .../{id}/tag/{tag_id}`).
**Galeri:** komponen media presigned (unggah → konfirmasi → set sampul `utama` tunggal → urutkan → hapus). Reuse B4; jangan duplikasi logika `utama`.
**Status:** toggle `draft → publikasi → arsip` via `PATCH .../{id}/status`. (Editor ini untuk pengelola → berwenang publikasi.)
**Hapus:** soft delete (`DELETE`) → hilang dari publik.

`POST`/`PATCH /desa/{slug}/destinasi[/{id}]`. `lokasi` dikirim `{lat,lng}` (backend → PostGIS).

---

## Editor Layanan

List `GET /desa/{slug}/layanan?jenis=&destinasi_id=&status=` → form.
Field: `nama`, `jenis` (enum: `transportasi|pemandu|penginapan|sewa_alat|kuliner|tiket_masuk|lainnya`), `deskripsi`, `harga`, `satuan_harga`, `destinasi_id` (opsional, tautkan ke spot), `penyedia_id` (opsional), `ketersediaan` (mis. `{kuota_harian}`), `status`.
**Kepemilikan (penting):** komponen editor layanan sama dipakai dua audiens — **pengelola** (semua layanan desa) dan **UMKM/Agen** (hanya layanan miliknya, di dashboard-nya). Beda hanya scope data + kepemilikan; render tombol/aksi sesuai peran. Backend menolak edit lintas-pemilik → tangani 403 dengan pesan jelas. *(`layanan.umkm_id` menyusul F1 — jangan tampilkan field itu sekarang.)*
Update/soft-delete analog destinasi.

---

## Editor Kalender Aktivitas

List `GET /desa/{slug}/kalender?destinasi_id=&tipe=` → form.
Field: `judul`, `tipe` (mis. `harian`), `destinasi_id`, `waktu_mulai`/`waktu_selesai` (jam), `pengulangan` (jsonb pola RRULE-like), `berlaku_mulai`/`berlaku_sampai`, `status`.
**RRULE di klien:** UI pengulangan (harian/mingguan/dst.) + **preview tanggal ter-ekspansi di klien** (pakai pustaka RRULE) — server hanya menyimpan aturan, tak mematerialisasi (Kontrak §5.3). Jujur soal batas: preview = perkiraan klien.
**Hapus:** `DELETE` (hard) **atau** set `status=nonaktif` — pilih pola "nonaktifkan" sebagai default aman, sediakan hard-delete eksplisit.

---

## Komponen reusable (buat sekali)

- **Map picker (titik + poligon)** — dipakai di sini + Discovery + Onboarding + switcher desa. Satu komponen, jangan tiga versi.
- **Galeri media presigned** — reuse B4 apa adanya (unggah/konfirmasi/utama/urut/hapus).

---

## Sistem desain

Reuse token & komponen Sigerciv (warna primer dari `desa.warna_primer`). Form panjang → seksi jelas, autosave draft lokal opsional (bukan offline-sync — sekadar UX), validasi inline, state simpan optimistic + rollback saat gagal, konfirmasi untuk publikasi/hapus. A11y AA: map wajib punya input koordinat manual sebagai fallback keyboard. Empty/loading/error ramah. Label generik "Pengelola Desa", brand **Sigerciv**.

---

## Gerbang (uji frontend — web, tanpa offline)

- **RBAC:** hanya peran kelola melihat `/[desa]/kelola/*`; non-pengelola → 403/redirect; resource desa lain → 404.
- **Alur inti:** buat destinasi draft → isi geo (titik wajib) → unggah media → set sampul → **publikasi**; wisatawan/publik tak melihat draft.
- **Slug unik:** bentrok `(desa_id, slug)` → 409 ditangani (pesan jelas, tak crash).
- **Geo valid:** titik wajib tersimpan; poligon opsional; fallback koordinat manual jalan.
- **Layanan kepemilikan:** editor menolak/menyembunyikan aksi lintas-pemilik; 403 ditangani.
- **Kalender RRULE:** preview ekspansi klien benar untuk pola umum; simpan aturan (bukan tanggal).
- **Media:** sampul `utama` tunggal; urut & hapus jalan (reuse B4).
- **A11y:** axe bersih; form & map keyboard-navigable.

---

## Batas

Harga/kuota transaksional & booking → **Dermaga (F2)**, bukan di sini (kalender F0 hanya info jadwal, bukan slot terjual). Entri lapangan **offline-first** → fase **PWA**. `layanan.umkm_id` & state-machine ketat (paket) → **F1**. Ekspansi jadwal server-side → ditambah bila Dermaga F2 memerlukan.

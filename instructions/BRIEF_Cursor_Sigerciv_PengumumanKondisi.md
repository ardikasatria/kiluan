# Brief Cursor — B/F-Kondisi: Pengumuman Kondisi Bahari & Darat

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung. *(Increment di atas F2.)*
**Cakupan:** modul **pengumuman kondisi terkini** (bahari/darat) per-desa, ditulis **organisasi + admin**, tampil di **landing** (+ etalase desa). Modul baru → **design-first, berpasangan B/F**.
**Mode:** **Next.js web murni (belum PWA)**. i18n via katalog; label kategori/tingkat via `kode`.
**Prasyarat:** F2 backend hijau; peran `organisasi` (scoped-desa) & `admin` (global) ada; lampiran media polimorfik (B4).
**Rujukan:** `ERD_Fase0 §2 konvensi (UUIDv7, CHECK enum, keyset, soft-delete)`, `KONTRAK_API_Fase0 §1 (RBAC, amplop error)`, brief F-Landing.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `backend/`: pola repo async + in-memory, model `tabel.py`, Alembic increment, amplop error, RBAC guard. Baca `frontend/`: kartu landing (F-Landing), shell + konteks desa/peran, galeri presigned, i18n. Ringkas file disentuh + risiko. **Jangan** ubah skema lama; increment baru saja.

---

## Rancang (kunci sebelum kode)

### Tabel `pengumuman_kondisi` (increment `000X_kondisi`)
- `id` UUIDv7 PK · `desa_id` FK → desa (target) · `dibuat_oleh` FK → pengguna ·
- `kategori` + `CHECK (kategori IN ('bahari','darat'))` ·
- `tingkat` + `CHECK (tingkat IN ('info','waspada','bahaya'))` (untuk warna/urgensi) ·
- `judul` · `isi` text · `sumber` text NULL (mis. "BMKG"/"Basarnas"/"observasi Pokdarwis") ·
- `berlaku_mulai` timestamptz · `berlaku_sampai` timestamptz NULL (null = sampai diarsipkan) ·
- `status` + `CHECK (status IN ('draft','terbit','arsip'))` · `dihapus_pada` NULL (soft) ·
- `dibuat_pada`/`diperbarui_pada`. Index `(desa_id, status, berlaku_mulai)`. Media via lampiran `entitas_tipe="pengumuman_kondisi"`.
- **"Terkini/aktif"** = `status='terbit' AND now ∈ [berlaku_mulai, COALESCE(berlaku_sampai, ∞)) AND dihapus_pada IS NULL`.
- *(Opsi multi-desa: bila perlu satu pengumuman ke banyak desa → tabel M2M `pengumuman_desa`. Default: satu desa/pengumuman; flag bila mau.)*

### Kontrak API
- `GET /discovery/kondisi` — **publik**, lintas-desa, hanya **aktif** → `[{desa{slug,nama}, kategori, tingkat, judul, ringkas, sumber, berlaku_sampai}]`. Kosong → `[]`.
- `GET /desa/{slug}/kondisi` — publik, aktif untuk satu desa.
- `GET /desa/{slug}/kondisi/kelola?status=` — mgmt (organisasi/admin), keyset.
- `POST /desa/{slug}/kondisi` — buat (organisasi anggota desa itu / admin).
- `PATCH /desa/{slug}/kondisi/{id}` · `PATCH .../{id}/status {status}` (terbit/arsip) · `DELETE .../{id}` (soft).

### Gerbang pytest (in-memory dulu, lalu SQL)
Hanya `organisasi`(desa itu)/`admin` menulis (lain → 403); organisasi tak bisa menulis untuk desa lain (403/404); publik hanya melihat `terbit`+dalam-window (draft/arsip/kedaluwarsa/soft-deleted **tak** bocor); transisi status; `GET /discovery/kondisi` mengagregasi aktif lintas-desa; kosong → `[]`.

---

## Scaffold + pytest (WAJIB sebelum frontend)

`layanan/kondisi.py` (aturan aktif-window, RBAC organisasi/admin, tenant) + repo in-memory → hijaukan gerbang. Lalu Alembic increment + repo SQL async. Frontend tak konsumsi sebelum hijau.

---

## Frontend

**Kartu landing "Kondisi Terkini"** (Gerbang): `GET /discovery/kondisi`. Tiap entri: desa, ikon kategori (🌊 bahari / ⛰️ darat), **warna per `tingkat`** (info=netral, waspada=kuning, bahaya=merah) **+ label teks** (jangan warna saja — a11y), judul, sumber, berlaku sampai; klik → etalase desa. **Empty state (wajib):** bila `[]`, tampilkan pesan ramah, mis. *"Belum ada pengumuman kondisi terkini — kondisi terpantau normal."* **Fail-soft:** endpoint gagal → kartu tak merusak halaman.

**Etalase desa `/[desa]`:** banner kondisi aktif (dari `/desa/{slug}/kondisi`), terutama `waspada`/`bahaya` menonjol (keselamatan wisatawan).

**Dashboard kelola `/[desa]/kelola/kondisi`** (organisasi/admin): list + editor (judul, isi, kategori, tingkat, sumber, window `berlaku_mulai/sampai`, media) + aksi terbit/arsip. **Admin:** pemilih desa target (reuse pemilih desa); **organisasi:** terkunci ke desanya. Peringatan sebelum menerbitkan `bahaya`.

---

## Gerbang (uji frontend — web)

- **RBAC:** hanya organisasi(desa)/admin melihat & menulis kelola; organisasi tak bisa desa lain.
- **Publik:** hanya aktif tampil; kedaluwarsa/draft/arsip tak muncul; **empty state** tampil saat kosong; fail-soft.
- **Landing card:** kategori+tingkat (warna **dan** teks), tautan ke desa; a11y kontras.
- **Admin target desa:** pemilih desa jalan; organisasi terkunci desanya.
- **i18n** kategori/tingkat ID/EN; **a11y** axe bersih.

---

## Batas

Notifikasi push saat `bahaya` → butuh modul notifikasi (celah backend) + PWA. Tarik-otomatis kondisi dari BMKG (bahari) → lihat brief **B/F-Cuaca** (itu prakiraan otomatis; modul ini pengumuman **yang ditulis manusia**, saling melengkapi). Offline → fase PWA.

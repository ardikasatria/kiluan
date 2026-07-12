# Brief Cursor — F-Discovery: Jelajah Lintas-Desa + Peta Lampung

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung, di-tuning AI & sains data. Flagship: Desa Wisata Teluk Kiluan.
**Cakupan:** halaman **`/jelajah`** — hasil pencarian destinasi **lintas-desa** + filter + **peta Lampung sebagai pemilih desa**. Memperluas B3/F3; "pilih desa" jadi menonjol sesuai visi Sigerciv.
**Mode:** **Next.js web murni (belum PWA)** — andalkan **SSR/ISR untuk SEO**, tanpa service worker/offline. Frontend di atas endpoint yang ada → **tanpa scaffold/pytest**; gerbang = uji frontend.
**Prasyarat:** F0 hijau. Endpoint: `GET /discovery/desa`, `GET /discovery/destinasi`, `GET /desa/{slug}`, `GET /desa/{slug}/destinasi`, `GET /kategori`, `GET /desa/{slug}/tag`.
**Rujukan:** `KONTRAK_API_Fase0 §4 (discovery) & §7 (DTO ringkas)`, brief B3/F3.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `frontend/`: halaman discovery/spot dari F3 (yang akan diperluas/dipindah), komponen **peta** yang sudah ada (Leaflet/MapLibre dari B2/B3 map picker — reuse), kartu destinasi, klien API + tipe DTO `Desa`/`Destinasi ringkas`, design tokens. Konfirmasi resolusi keyset & param query. Typecheck/lint hijau. Ringkas file disentuh + risiko. **Jangan** ubah `/[desa]` & `/[desa]/spot/[id]` (tetap B3) — brief ini menambah `/jelajah` dan memindahkan discovery dari `/` (kini landing).

---

## Rekonsiliasi rute (penting)

`/` sekarang **landing marketing** (brief Landing). Discovery/hasil pencarian pindah ke **`/jelajah`**. `/[desa]` (etalase desa) & `/[desa]/spot/[id]` (detail spot) **tak berubah** dari B3. Menu "Jelajah" → `/jelajah`. Filter tersimpan di **query params** (shareable + SEO, dibaca SSR).

---

## Dua lensa dalam satu halaman `/jelajah`

Selector scope di atas: **"Semua Lampung"** ↔ **desa tertentu**. Layout: rail filter kiri · daftar hasil tengah · **peta kanan** (sticky). Peta & daftar tersinkron (hover/klik saling sorot).

**Lensa A — Pilih Desa (peta Lampung).** Dari `GET /discovery/desa` (hanya `status=aktif`): marker desa di peta Lampung + daftar kartu desa (nama, wilayah, jumlah destinasi bila ada, logo/warna). Klik desa → set scope ke desa itu (memfilter hasil via `desa=`), plus tautan **"Buka etalase desa"** (`/[desa]`). Ini pembeda Sigerciv: menjelajah **antar desa**, bukan satu destinasi saja.

**Lensa B — Cari Wisata (destinasi lintas-desa).** Dari `GET /discovery/destinasi` (agregasi `publikasi` lintas desa `aktif`): kartu destinasi (media utama, nama, kategori, desa asal, `jarak_m` bila `dekat` dipakai). Marker destinasi di peta. **Muat lebih banyak** via keyset.

Peta menampilkan marker sesuai lensa aktif; banyak marker → **clustering** (perf).

---

## Filter (query params)

- **Kategori** — dari `GET /kategori` (global). Berlaku lintas-desa.
- **Pencarian `q`** — nama/deskripsi. Lintas-desa.
- **Terdekat `dekat=lat,lng&radius_m=`** — pakai **geolocation browser** (izin); gagal/ditolak → fallback pusat Lampung tanpa `jarak_m`. Saat aktif, hasil menyertakan `jarak_m` & default urut jarak.
- **Desa (`desa=`)** — dari selector scope / klik marker desa.
- **Tag** — **hanya saat satu desa dipilih** (`GET /desa/{slug}/tag`), karena tag ber-scope desa; di mode "Semua Lampung" sembunyikan filter tag (jujur soal batas kontrak).

Semua perubahan filter → update URL → SSR/CSR fetch ulang. Chip filter aktif + tombol reset.

---

## Data & sumber

Cross-desa: `/discovery/destinasi` + `/discovery/desa`. Per-desa terpilih: bisa tetap `/discovery/destinasi?desa=` (konsisten) atau `/desa/{slug}/destinasi`; pilih satu, konsisten. Kategori/tag dari endpoint referensi. **SSR/ISR** untuk render awal (SEO: meta/OG per state pencarian utama), lalu interaksi filter di klien. Publik → hanya `publikasi` + `desa aktif`; lintas-tenant → 404.

**Komponen peta pemilih desa** dibuat reusable — dipakai juga di **Onboarding step "pilih desa"** & **switcher desa dashboard**. Jangan bikin tiga versi.

---

## Sistem desain

Reuse token & komponen Sigerciv (warna primer dari `desa.warna_primer`, fallback bahari). Kartu desa & kartu destinasi konsisten dengan Landing. Peta: marker jelas, cluster, popup ringkas, sinkron daftar. **Aksesibilitas:** peta wajib punya **fallback daftar** yang keyboard-navigable (peta bukan satu-satunya jalan); kontras AA; fokus terlihat. Empty/loading/error state ramah.

---

## Gerbang (uji frontend — web, tanpa offline)

- **Rekonsiliasi rute:** `/jelajah` menampung discovery; `/` tetap landing; `/[desa]`/spot tak berubah.
- **Publik saja:** hasil hanya `publikasi` + desa `aktif` (mock); lintas-tenant → 404.
- **Filter benar:** kategori/`q`/`dekat`/`desa` mengubah hasil sesuai param; tag hanya muncul saat desa dipilih.
- **Keyset:** "muat lebih banyak" stabil tanpa duplikat/lewat.
- **Peta ↔ daftar:** marker desa dari `/discovery/desa`; marker destinasi dari hasil; klik desa men-scope + tautan etalase; hover saling sorot; clustering jalan.
- **Geolokasi:** izin ditolak → fallback pusat Lampung, tanpa `jarak_m`, halaman tetap jalan.
- **SEO/SSR:** render awal server-side; meta/OG terisi; URL filter shareable.
- **A11y:** fallback daftar keyboard-navigable; axe bersih.

---

## Batas / catatan

Rekomendasi terpersonalisasi (Pemandu AI, tuning sains data) → F2+. Offline-first / caching peta → ditunda ke fase **PWA**. Tag lintas-desa (gabungan) → tak didukung kontrak F0; bila diinginkan, butuh endpoint tag global (flag ke Satria, jangan diakali di klien).

# ADR-04 — Kunci Kontrak API Fase 1

**Status:** Diterima (F1). Kontrak dikunci; perubahan setelah ini lewat revisi ADR, bukan edit diam-diam.
**Konteks pengambil keputusan:** Satria (technical lead) + co-architect.
**Terkait:** `ERD_Kiluan_Fase1.md` (terkunci), `KONTRAK_API_Kiluan_Fase1.md`, scaffold `kiluan_f1/` (28 pytest hijau). Menurunkan: ADR-05..08.

## Konteks

Kontrak API F1 diturunkan dari ERD F1 yang sudah terkunci, mewarisi seluruh konvensi F0 (base path, auth, tenant path, keyset, amplop error, soft delete). Sebelum scaffold diwujudkan ke FastAPI (brief B5–B8), kontrak perlu dikunci agar scaffold, brief, dan kode nyata berbagi satu sumber kebenaran. Tiga posisi internal-kontrak menuntut keputusan eksplisit karena tak diturunkan mekanis dari ERD.

## Keputusan

**Kontrak API F1 diterima apa adanya**, dengan tiga posisi berikut dikunci:

1. **Transisi seragam.** Semua perpindahan status lewat `POST /desa/{slug}/{resource}/{id}/transisi { aksi, catatan? }`, dengan `aksi` memakai kosakata **identik** `kurasi_log.keputusan` = `ajukan | setuju | tolak | minta_revisi` (+ `arsip` khusus paket). Satu bentuk untuk tiga mesin status (`paket_wisata`, `kontribusi`, `pengajuan_kartu`). UI boleh me-relabel (`setuju`→"Validasi" pada pengajuan), domain action tetap `setuju`.

2. **`arsip` = lifecycle owner, TIDAK menulis `kurasi_log`.** ERD mengunci `keputusan` pada empat nilai; diagram §5 punya transisi `arsip`. Daripada memperluas enum (membuka ERD), `arsip` diperlakukan sebagai transisi lifecycle oleh pemilik/pengelola tanpa mencatat `kurasi_log`. `kurasi_log` khusus keputusan kurasi.

3. **Polimorfik dijaga aplikasi.** `kontribusi.target_*`, `pengajuan_kartu.subjek_*`, `kurasi_log.entitas_*` tanpa FK keras; validasi tipe + eksistensi + se-tenant dilakukan service. Award poin tidak pernah lewat endpoint publik — hanya dipicu event domain.

## Konsekuensi

- Scaffold `kiluan_f1/` sudah mencerminkan ketiga posisi (mesin_status seragam; `TANPA_LOG={("paket_wisata","arsip")}`; polimorфik divalidasi service) → brief B5–B8 tinggal mewujudkan, bukan menafsir ulang.
- Uji `arsip` **tidak** boleh menghasilkan baris `kurasi_log` (gerbang §10, sudah hijau di scaffold).
- Karena tanpa FK keras, tiap modul polimorфik **wajib** uji kebocoran lintas-tenant (target/subjek desa lain → 404).
- Empat keputusan lintas-modul turunan dipisah ke ADR tersendiri: migrasi (05), idempotensi (06), auto-apply (07), ranking (08).

## Alternatif yang tidak diambil

- **Endpoint verba per-entitas** (`/paket/{id}/publikasikan`, dst.) — lebih deskriptif tapi memecah audit & guard; ditolak demi keseragaman `kurasi_log`.
- **Perluas enum `keputusan` dengan `arsip`** — membuka ERD terkunci untuk kenyamanan minor; ditolak.
- **Tabel join per tipe target** (ganti polimorфik) — integritas FK penuh tapi ledakan tabel & rigid; ditolak untuk kebutuhan crowdsource yang cair.

## Pemicu tinjau ulang

Tinjau bila: volume audit `arsip` ternyata dibutuhkan untuk kepatuhan (→ pertimbangkan tabel lifecycle-log terpisah, bukan perluas enum), ATAU integritas polimorфik jadi sumber bug berulang (→ pertimbangkan tabel join untuk entitas paling rawan).

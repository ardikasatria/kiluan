# Brief Cursor — F-NaikKelas: Naik Kelas Lestari (Kartu Aksi · Pengajuan · Tingkat)

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung. *(Fase F1, sisi owner dari Misi Kiluan.)*
**Cakupan:** sisi **owner** (UMKM/Agen) — katalog **kartu aksi** (belajar sambil naik kelas), **ajukan bukti**, lacak status, **progres tingkat** 🌱 Tunas → 🐚 Bahari → 🐬 Lumba-Lumba; + sisi **validator** (pengelola); + tampilan sertifikasi publik.
**Mode:** **Next.js web murni (belum PWA)** — tanpa offline. String UI via katalog i18n; konten kartu satu bahasa (opsi A). Label `tingkat` via `kode`.
**Prasyarat:** F1 backend hijau (B8). Endpoint: `GET /desa/{slug}/kartu-aksi[/{id}]`, `POST /desa/{slug}/pengajuan-kartu`, `GET .../pengajuan-kartu[?status=&subjek=&milik=saya]`, `GET .../pengajuan-kartu/{id}`, `PATCH .../pengajuan-kartu/{id}`, `POST .../pengajuan-kartu/{id}/transisi`, `GET /desa/{slug}/sertifikasi?subjek_tipe=&subjek_id=`, media presigned (bukti).
**Rujukan:** `KONTRAK_API_Fase1 §7 & §6 (state machine) & §8 (DTO) & §9.7 (boost ranking)`, brief F-Kurasi/F-Pasar.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `frontend/`: shell + konteks desa/peran, `<AntreanKurasi>`/`<PanelKeputusan>`/`<BadgeStatus>` (F-Kurasi), `<TingkatSertifikasi>` chip (F-Pasar), galeri/upload presigned (B4), klien API + tipe DTO `KartuAksi/PengajuanKartu/SertifikasiOwner`, pola i18n. Typecheck/lint hijau. Ringkas file disentuh + risiko. **Jangan** duplikasi panel keputusan/logika kepemilikan.

---

## Aturan domain yang mengikat UI (jujur)

- **Kepemilikan:** owner hanya mengajukan untuk **subjek miliknya** (`umkm`/`agen`); **Pengelola Desa** (`pokdarwis`/`perangkat_desa`/`admin`) = validator. Lintas-pemilik → 403.
- **Bukti wajib:** `POST pengajuan-kartu` harus memenuhi bentuk `kartu.bukti_dibutuhkan` → kurang = `422`. Pra-validasi di klien + tetap tangani 422.
- **State machine pengajuan** (`/transisi {aksi, catatan?}`, sama pola kontribusi): `menunggu` → **setuju(validasi)**/`tolak`/`minta_revisi` (validator); `minta_revisi` → `revisi` → **ajukan** (owner, kirim ulang setelah `PATCH` bukti) → `menunggu`. Tiap keputusan menulis `kurasi_log`.
- **Tingkat = hasil kartu tervalidasi.** `GET /sertifikasi` mengembalikan `tingkat`+`skor`; ini **denormalized** dari pengajuan tervalidasi. Naik tingkat hanya bila syarat tingkat terpenuhi.
- **Ambang tingkat & "kartu wajib" (mis. untuk Bahari) = input tata kelola Pokdarwis** — **jangan hard-code** di frontend; baca syarat/progres dari backend. (ADR §9.7.)
- **Anti-greenwashing:** tingkat mencerminkan praktik **berbukti** (bukti tervalidasi), bukan klaim. UI tak boleh menaikkan tampilan tingkat tanpa data backend.

---

## Sisi Owner — `/[desa]/kelola/naik-kelas`

**Progres tingkat (atas):** `<TingkatSertifikasi>` besar (tingkat kini + skor) + **peta jalan**: kartu sudah tervalidasi vs kartu yang dibutuhkan untuk tingkat berikut — **dari backend**, bukan asumsi. Insentif ditampilkan jujur: tingkat lebih tinggi → badge di Pasar Desa + peluang tampil lebih sering (rotasi eksposur, bukan jaminan urutan).

**Katalog kartu aksi:** `GET /kartu-aksi` (template+lokal). Kartu: nama, deskripsi, **`kenapa_penting`** (modul edukasi — "belajar sambil naik kelas"), `bukti_dibutuhkan`, status pengajuan owner (belum diajukan / menunggu / tervalidasi / ditolak / revisi).

**Ajukan / revisi:** form unggah bukti sesuai `bukti_dibutuhkan` (foto/dokumen via presigned + field terstruktur) → `POST pengajuan-kartu`. Saat `revisi` → `PATCH` bukti lalu **Ajukan ulang** (`transisi {aksi:"ajukan"}`). Lacak status + tampilkan **catatan validator** saat ditolak/revisi.

**Pengajuan saya:** `GET pengajuan-kartu?milik=saya` — daftar lintas status.

---

## Sisi Validator (pengelola) — `/[desa]/kelola/naik-kelas/validasi`

Antrean `GET pengajuan-kartu?status=menunggu` (dan `subjek`). **Reuse `<AntreanKurasi>` (entitas_tipe=`pengajuan_kartu`) + `<PanelKeputusan>`** dari F-Kurasi: **Validasi / Minta Revisi / Tolak** + `catatan` → `POST .../transisi`. Detail menampilkan kartu + bukti (galeri/dokumen) + subjek. Validasi → tingkat subjek ter-recompute (tampilkan efeknya). Wajibkan `catatan` untuk tolak/minta_revisi.

> Boleh juga ditempatkan sebagai **tab di hub Kurasi** (F-Kurasi) daripada rute terpisah — pilih satu, konsisten. Karena komponen sama, tak ada kerja ganda.

---

## Sertifikasi publik

Reuse `<TingkatSertifikasi>` di kartu & detail UMKM (sudah di F-Pasar). Opsional: halaman publik per-owner `/[desa]/pasar/umkm/{id}` sudah menampilkan tingkat + skor; bila perlu, seksi "perjalanan Naik Kelas" (kartu tervalidasi, tanpa bukti mentah pribadi). Publik hanya melihat hasil, bukan bukti internal.

---

## Sistem desain

Reuse token & komponen Sigerciv. Komponen: peta jalan tingkat (progress), kartu aksi dengan modul `kenapa_penting` (expandable), form bukti (presigned). i18n via katalog (label/aksi/tingkat); konten kartu/`kenapa_penting` apa adanya. A11y AA; empty/loading/error ramah; konfirmasi untuk tolak. Brand **Sigerciv**, label generik "Pengelola Desa".

---

## Gerbang (uji frontend — web, tanpa offline)

- **Owner ajukan:** bukti kurang → 422 (pra-validasi klien + backend); status terlacak; revisi → PATCH bukti → ajukan ulang jalan; catatan validator tampil.
- **Progres tingkat:** syarat/kartu-wajib dibaca dari backend (tak hard-code); kartu tervalidasi vs dibutuhkan benar.
- **Validator:** antrean menunggu; validasi/tolak/minta_revisi + catatan (reuse `<PanelKeputusan>`); validasi → tingkat ter-recompute tampil; `catatan` wajib pada tolak/revisi.
- **Kepemilikan/tenant:** owner hanya subjek miliknya (403 lintas-pemilik); desa lain → 404.
- **Publik:** tingkat + skor tampil; bukti internal tak bocor ke publik.
- **i18n:** tingkat/aksi/status terjemah ID/EN; **a11y** axe bersih.

---

## Batas

Ambang tingkat & daftar kartu wajib = **tata kelola Pokdarwis** (input backend, bukan UI). Loop bukti F2 (`verifikasi` generik menautkan `pengajuan_kartu`) → opsional, aktif bila F2 menyala. Boost ranking Pasar Desa (campur tingkat + kebaruan + rotasi) = otoritas backend — UI hanya menampilkan hasil. Offline unggah bukti → fase **PWA**.

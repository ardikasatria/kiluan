# Brief Cursor — F-Penjelajah: Penjelajah Lestari (Misi · Micro-lesson · QR Stasiun · Paspor)

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung. *(Fase F2, sisi wisatawan dari Misi Kiluan.)*
**Cakupan:** katalog **Misi**, **micro-lesson** wajib, penyelesaian misi via **QR Stasiun Lestari / foto-geotag / konfirmasi pemandu**, **Paspor Lestari** (impact passport), + antrean **verifikator** (pengelola/pemandu). Tenant-scoped.
**Mode:** **Next.js web murni (belum PWA)** — kamera & geolokasi jalan di web (butuh HTTPS + izin). String UI lewat katalog i18n; konten misi/lesson satu bahasa (opsi A F-i18n).
**Prasyarat:** F2 backend hijau (Penjelajah Lestari + `verifikasi`). Endpoint: `GET /desa/{slug}/misi[/{id}]`, `GET /desa/{slug}/stasiun`, `POST /desa/{slug}/misi/{id}/selesai`, `GET /desa/{slug}/paspor/saya`, `GET /desa/{slug}/verifikasi`, `POST .../verifikasi/{id}/putuskan`, media presigned (foto bukti).
**Rujukan:** `KONTRAK_API_Fase2 §6 (Penjelajah Lestari + Verifikasi) & §8 (DTO)`, `ERD_Fase2`, `BLUEPRINT ★ Misi Kiluan`.

> **Konteks penamaan:** ini **Penjelajah Lestari** (wisatawan). **Naik Kelas Lestari** (owner: kartu aksi + tingkat 🌱→🐚→🐬, seed F1) = brief terpisah — beri tahu bila mau dibuat.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `frontend/`: shell + konteks desa/peran, galeri/upload presigned (B4), `<BadgeStatus>`/`<PanelKeputusan>` (F-Kurasi), map/geolokasi util, klien API + tipe DTO `Misi/StasiunLestari/PasporLestari/Stempel/Verifikasi`, pola i18n. Cek apakah sudah ada pustaka QR/kamera. Typecheck/lint hijau. Ringkas file disentuh + risiko. **Jangan** duplikasi logika verifikasi/panel keputusan.

---

## Aturan domain yang mengikat UI (jujur)

- **Belajar dulu:** misi `jenis=belajar` membuka **micro_lesson wajib** (kode etik lumba/karang/sampah). Tuntas → verifikasi `otomatis` → stempel `terverifikasi`, dan **membuka misi `aksi`** yang bergantung. Baca prasyarat dari payload misi — **jangan hard-code** dependensi.
- **Metode verifikasi** (`syarat_verifikasi.metode`): `qr_checkin` (cocokkan `qr_token` stasiun + **geofence** `radius_m`), `foto_geotag` (foto + lokasi), `konfirmasi_pemandu` (tetap **menunggu** sampai keputusan manual), `otomatis` (belajar).
- **Anti-greenwashing:** **hanya stempel `terverifikasi`** masuk `ringkasan_dampak` Paspor. Stempel `menunggu_verifikasi`/`ditolak` tampil dengan status, **tidak** dihitung ke total dampak. Jangan tampilkan klaim dampak yang belum terverifikasi sebagai fakta.
- **Auth:** browse katalog boleh tamu; **mulai/selesaikan misi & Paspor butuh login**.
- **Error selesai:** `422 di_luar_geofence` (bukan di lokasi), `422 bukti_kurang` — tangani dengan pesan jelas.

---

## Katalog Misi — `/[desa]/misi`

List `GET /desa/{slug}/misi` (aktif). Filter kategori/jenis. Kartu: judul, kategori, badge **jenis** (belajar/aksi), reward (poin + badge + kupon bila ada), stasiun terkait. Misi `aksi` yang prasyarat belajarnya belum tuntas → tampil **terkunci** + ajakan selesaikan lesson dulu. Detail `/[desa]/misi/{id}`: deskripsi, `syarat_verifikasi` (metode + apa yang dibutuhkan), stasiun (nama + peta + jarak dari lokasi pengguna bila izin lokasi), reward.

---

## Micro-lesson (jenis=belajar)

Tampilkan konten `micro_lesson` (modul singkat kode etik). Akhiri dengan konfirmasi paham (atau kuis ringan bila payload menyediakan). "Selesai" → `POST /misi/{id}/selesai` (metode `otomatis`) → stempel `terverifikasi`. Setelah itu, misi `aksi` terkait terbuka. Konten lesson = satu bahasa (opsi A i18n); UI chrome tetap ID/EN.

---

## Menyelesaikan misi aksi

**`POST /desa/{slug}/misi/{id}/selesai`** `{ booking_id?, bukti{ qr_token?, lokasi{lat,lng}, foto_media_id? }, dampak }`.

- **QR check-in (`qr_checkin`):** komponen **pemindai QR** (kamera web `getUserMedia` + pustaka decode; butuh HTTPS+izin) di Stasiun Lestari → dapat `qr_token` → **ambil geolokasi** → kirim. Sinkron: lolos geofence → stempel `terverifikasi` seketika; gagal → `422 di_luar_geofence` ("kamu harus berada di **{Stasiun}**"). **Fallback aksesibilitas:** input `qr_token` manual (dari papan fisik) — geofence tetap divalidasi via lokasi, jadi aman.
- **Foto-geotag (`foto_geotag`):** unggah foto (presigned) + geolokasi → kirim; verifikasi sesuai `syarat`.
- **Konfirmasi pemandu (`konfirmasi_pemandu`):** kirim → stempel `menunggu_verifikasi`; tampilkan state "menunggu konfirmasi pemandu"; **tidak** masuk dampak sampai valid.
- **`dampak`** diisi sesuai `dampak_template` misi (mis. jumlah mangrove). `booking_id` opsional (tautkan ke kunjungan bila ada; booking = Dermaga, opsional di sini).

> **Batas koneksi (jujur):** penyelesaian butuh koneksi live (scan+kirim). Di lokasi bersinyal terbatas ini berisiko; **antrean offline (isi tanpa sinyal, sinkron belakangan) ditunda ke fase PWA**. Jangan janjikan offline sekarang.

---

## Paspor Lestari — `/[desa]/paspor` (login)

`GET /desa/{slug}/paspor/saya`. Tampilkan **ringkasan dampak** ("kamu bantu tanam 5 mangrove, kurangi 2 kg sampah") **hanya dari stempel terverifikasi**, `total_stempel`, dan galeri `stempel[]` (kartu: misi, stasiun, dampak, **status badge**, foto). Reward terkumpul (poin/badge) tertaut ke Lencana (F1). Kupon hasil misi → tampil "tersimpan"; penukaran/checkout = Dermaga (di luar brief ini).

---

## Verifikator (pengelola/pemandu) — menutup loop `konfirmasi_pemandu`

`/[desa]/kelola/verifikasi`: antrean `GET /desa/{slug}/verifikasi?entitas_tipe=stempel&hasil=menunggu`. Detail stempel (foto, lokasi di peta, dampak diklaim). **Reuse `<PanelKeputusan>`** (F-Kurasi): **Valid / Invalid** + `catatan` → `POST .../verifikasi/{id}/putuskan`. `valid` → stempel terverifikasi + paspor terupdate; `invalid` → ditolak. Hanya peran verifikator (agen/pokdarwis/perangkat). Ini yang membuat aksi *berbukti*, bukan klaim sepihak.

---

## Sistem desain

Reuse token & komponen Sigerciv. Komponen baru: **`<PemindaiQR>`** (kamera + fallback input manual), kartu misi, kartu stempel, tampilan micro-lesson. Peta stasiun + indikator jarak/geofence. i18n via katalog (label/aksi), konten misi/lesson apa adanya. A11y AA: pemindai QR punya fallback input manual; izin kamera/lokasi ditolak → pesan jelas + jalur alternatif. Empty/loading/error ramah. Brand **Sigerciv**.

---

## Gerbang (uji frontend — web, tanpa offline)

- **Gating belajar:** misi aksi terkunci sampai prasyarat belajar tuntas; lesson selesai → aksi terbuka (baca dari payload, bukan hard-code).
- **QR check-in:** scan/isi manual + geolokasi → kirim; lolos → terverifikasi; `422 di_luar_geofence` ditangani dengan pesan lokasi.
- **Foto-geotag:** unggah presigned + lokasi → kirim; `bukti_kurang` ditangani.
- **Konfirmasi pemandu:** stempel `menunggu` tampil; **tak** masuk ringkasan dampak.
- **Paspor:** ringkasan dampak **hanya** dari terverifikasi; auth wajib; stempel menunggu/ditolak tampil berstatus tapi tak dihitung.
- **Verifikator:** antrean menunggu; putuskan valid/invalid + catatan (reuse `<PanelKeputusan>`); valid → paspor terupdate.
- **Auth:** tamu browse; mulai/selesai/paspor → login.
- **Izin:** kamera/lokasi ditolak → fallback/pesan; **i18n** label terjemah ID/EN; a11y axe bersih.

---

## Batas

Antrean offline penyelesaian misi → **fase PWA**. Booking/kehadiran (`booking_id`), penukaran kupon & checkout → **Dermaga (F2, brief terpisah)**. Loop data ekologi penuh (monitoring survival, Neraca) → **F3**. Naik Kelas Lestari (owner) → brief F1 terpisah. Pemandu LLM → di-gate (rule-based dulu).

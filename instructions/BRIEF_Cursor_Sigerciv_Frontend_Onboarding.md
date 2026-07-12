# Brief Cursor — F-Onboarding: Gabung Komunitas (Ajukan Peran)

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung, di-tuning AI & sains data. Flagship: Desa Wisata Teluk Kiluan.
**Cakupan:** alur *Gabung Komunitas* — pengguna login mengajukan peran (**Wisatawan / UMKM / Agen Lokal / Pokdarwis**) di **desa mana pun** di Lampung, plus state **"menunggu persetujuan"**. Murni frontend di atas endpoint yang sudah ada → **tanpa scaffold/pytest**; gerbang = uji frontend.
**Prasyarat:** auth sudah jalan (sesi login aktif). Endpoint tersedia: `GET /discovery/desa`, `GET /desa/{slug}`, `GET /peran`, `POST /desa/{slug}/keanggotaan`, `GET /saya/keanggotaan`.
**Rujukan:** `KONTRAK_API_Fase0 §2 (global & tenant), §6 matriks RBAC`, `BLUEPRINT §3 Aktor/Peran`.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `frontend/`: guard rute berbasis sesi (auth sudah ada), klien API + tipe DTO `Desa`/`Keanggotaan`/`Peran`, komponen kartu/stepper/desa-picker yang sudah ada (reuse, jangan duplikasi), design tokens. Konfirmasi titik masuk: CTA "Gabung" di landing, item "Gabung komunitas" di dropdown, dan "ajukan peran" di Akun. Typecheck/lint hijau. Ringkas file yang disentuh + risiko. **Jangan** definisikan ulang util sesi/tenant — konsumsi.

---

## Aturan domain yang mengikat perilaku UI

- **Wisatawan = peran global, auto-`aktif`.** Tak perlu pilih desa, tak perlu persetujuan → submit langsung aktif.
- **UMKM / Agen / Pokdarwis = scoped-desa** → **wajib pilih desa**, submit menghasilkan `status=menunggu` (butuh persetujuan `pokdarwis`/`perangkat_desa`/`admin`).
- **`POST /desa/{slug}/keanggotaan` hanya menerima `{ peran }`** — tak ada field motivasi/dokumen. Jangan tambahkan field yang tak didukung backend (bila ingin lampiran/motivasi → celah backend, flag ke Satria).
- **Duplikat `(pengguna, desa, peran)` → `409`.** Karena unik, mengajukan ulang peran yang sebelumnya **`ditolak` juga akan `409`** (satu baris per kombinasi). UI tangani 409 dengan jelas; keputusan "boleh ajukan ulang setelah ditolak" = **keputusan backend** (flip status vs baris baru) → tandai, jangan paksakan di klien.

---

## Alur (wizard/stepper)

**Guard:** butuh login. Tamu → arahkan ke Masuk lalu kembali (return-to).

1. **Pilih peran** — 4 kartu: Wisatawan, UMKM, Agen Lokal, Pokdarwis. Tiap kartu: ikon, satu kalimat "apa ini", "apa yang bisa kamu lakukan", dan penanda **"perlu persetujuan"** (untuk 3 peran scoped) vs **"langsung aktif"** (wisatawan). Ambil label peran dari `GET /peran`.
2. **Pilih desa** *(dilewati untuk wisatawan)* — daftar desa `aktif` dari `GET /discovery/desa` dengan **pencarian + peta Lampung** (reuse komponen peta). Tampilkan profil ringkas (`GET /desa/{slug}`) saat dipilih. Ini inti visi Sigerciv lintas-desa.
3. **Konfirmasi** — ringkas peran + desa + konsekuensi ("pengajuanmu akan ditinjau pengelola desa"). Tombol Ajukan → `POST /desa/{slug}/keanggotaan { peran }`.
4. **Hasil:**
   - Wisatawan → **aktif** seketika; CTA "Mulai jelajah".
   - Scoped → **menunggu persetujuan**; jelaskan langkah berikut tanpa menjanjikan waktu; CTA "Lihat status keanggotaan".
   - `409` → state "kamu sudah punya/mengajukan peran ini di desa ini" + arahkan ke status.

## State "menunggu persetujuan" & daftar keanggotaan

Halaman/section **Status Keanggotaan** (reuse di Akun, `GET /saya/keanggotaan`): daftar peran lintas-desa dengan badge status — **aktif · menunggu · ditolak · nonaktif** — dan desa terkait. `menunggu` → tampil "sedang ditinjau"; `ditolak` → tampil alasan bila ada + arahan (hubungi pengelola / lihat catatan 409 di atas). Ini pintu masuk pengguna memantau pengajuannya.

> **Batas:** sisi **peninjau** (antrean setujui/tolak via `GET`/`PATCH /desa/{slug}/keanggotaan`) ada di **brief F-Dashboard** (Pokdarwis/Perangkat Desa), bukan di sini.

---

## Sistem desain

Reuse token & komponen Sigerciv (warna primer dari `desa.warna_primer`, fallback bahari). Stepper aksesibel (keyboard, ARIA, progress jelas), desa-picker dengan peta + daftar, kartu peran informatif tapi ringkas, empty/loading/error state ramah. Brand header = **Sigerciv**.

---

## Gerbang (uji frontend — pengganti pytest)

- **Guard:** tamu diarahkan Masuk lalu kembali ke alur.
- **Wisatawan:** submit → aktif tanpa langkah pilih desa.
- **Scoped:** wajib pilih desa; submit → state menunggu tampil.
- **409 ditangani:** pengajuan ganda tak crash; pesan jelas + arahan.
- **Status keanggotaan:** `GET /saya/keanggotaan` merender badge aktif/menunggu/ditolak benar per desa.
- **A11y:** axe bersih; stepper & desa-picker keyboard-navigable.

---

## Batas / flag ke Satria

Field motivasi/dokumen pada pengajuan (butuh perluasan endpoint) · kebijakan ajukan-ulang setelah `ditolak` (keputusan backend: flip status vs baris baru) · notifikasi saat pengajuan disetujui/ditolak (butuh modul notifikasi — celah backend). Semua ditampilkan apa adanya, tanpa mengarang perilaku.

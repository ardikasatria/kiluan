# Brief Cursor — F-Akun: Menu Pengguna (Dropdown) + Akun & Preferensi

**Platform:** **Sigerciv** — pariwisata regeneratif untuk desa-desa di Lampung, di-tuning dengan AI & sains data. Instans flagship: Desa Wisata Teluk Kiluan. *Rebrand = lapisan brand/UI saja, tanpa perubahan skema/migrasi.*
**Cakupan:** (A) spesifikasi menu dropdown pengguna, (B) halaman **Akun & Preferensi** = *informasi personal* + *konfigurasi personal*. Multi-peran, multi-desa (Lampung-wide).
**Prasyarat:** F0 hijau (auth, `/saya`, `PATCH /saya`, `/saya/keanggotaan`, `/desa/{slug}/keanggotaan`, media presign). Murni frontend di atas API yang ada → **tanpa scaffold/pytest**; gerbang = uji frontend. Celah backend ditandai eksplisit.
**Rujukan:** `KONTRAK_API_Fase0 §2 Global (/saya, /auth/*) & §5 media`, `BLUEPRINT §3 Aktor/Peran`.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `frontend/`: layout header/topbar, resolusi sesi + `/saya`/`/saya/keanggotaan`, alur avatar presigned (brief B4), design tokens & komponen, klien API. Konfirmasi konteks aktif (desa+peran) sudah dikelola shell dashboard (brief F-Dashboard) — **konsumsi**, jangan definisikan ulang. Typecheck/lint hijau. Ringkas file yang disentuh + risiko.

---

## A. Menu dropdown pengguna (klik avatar)

Dua state.

**Tamu (belum login):** tombol **Masuk** + **Daftar**; tautan *Jelajah* & *Gabung komunitas*. (Bukan dropdown penuh.)

**Terautentikasi:** panel dropdown, item **difilter peran** (RBAC) — tampilkan hanya yang relevan:
- **Header identitas:** avatar, nama, email; ringkas poin & lencana bila wisatawan (F1).
- **Konteks aktif:** chip *desa + peran aktif* + tautan **Ganti desa/peran** (switcher; penting karena Sigerciv lintas-desa Lampung).
- **Dashboard saya** → dashboard sesuai peran aktif.
- **Paspor Lestari** (wisatawan; F2 → "segera" bila belum aktif).
- **Wishlist saya** → `/saya/wishlist` (lihat brief F-Wishlist).
- **Pesanan / Booking saya** (thin-F2; else "segera").
- **Kontribusi saya** (F1).
- **Poin & Lencana** (F1).
- **Akun & Preferensi** → §B.
- **Panduan & Bantuan** (pasang PWA, kode etik wisata regeneratif).
- **Keluar** (`POST /auth/keluar`).

Aksesibilitas: dropdown keyboard-navigable, ARIA menu, tutup on Esc/klik luar. Item non-tersedia (fase belum aktif) → label "segera", bukan disembunyikan senyap.

---

## B. Akun & Preferensi

Halaman `/saya/akun` dengan navigasi tab/section kiri. Dua klaster sesuai permintaan.

### B.1 Informasi Personal
- **Avatar:** unggah via presigned MinIO (reuse alur B4) → `PATCH /saya {avatar_media_id}`.
- **Nama, telepon, bio singkat:** `PATCH /saya`.
- **Email:** tampilkan + status terverifikasi. **Ubah email → celah backend** (belum ada endpoint; kontrak hanya verifikasi saat daftar). Sampai ada: field read-only + tautan "hubungi admin" / "segera".
- **Minat & personalisasi (on-vision):** pilih kategori/aktivitas favorit → dasar tuning rekomendasi **Pemandu** (AI, F2). Sertakan **consent eksplisit** "gunakan aktivitas saya untuk personalisasi" (data milik komunitas, bisa dicabut). **Penyimpanan preferensi = celah backend** → render dengan state simpan lokal + "segera tersimpan ke akun".

### B.2 Konfigurasi Personal
- **Keamanan:**
  - *Ubah kata sandi* saat login → **celah backend** (kontrak hanya `reset-sandi` berbasis token). Sementara: arahkan ke alur "lupa sandi" atau tandai "segera".
  - *Sesi & perangkat:* keluar dari semua perangkat (cabut refresh) — didukung konsep kontrak (rotasi/cabut sesi); *daftar sesi aktif* = celah backend.
- **Keanggotaan & peran:** daftar peran lintas-desa (`/saya/keanggotaan`) + status (aktif/menunggu/ditolak); **ajukan peran di desa** (`POST /desa/{slug}/keanggotaan`) — pintu masuk "Gabung komunitas" untuk jadi UMKM/Agen/Pokdarwis di desa mana pun di Lampung.
- **Notifikasi:** toggle email/push per kategori (misi, pesanan, kurasi). Push via PWA (Android/desktop; iOS 16.4+). **Penyimpanan prefs + push subscription = celah backend** → simpan subscription lokal, tandai bagian "segera".
- **Tampilan:** bahasa (ID default; slot i18n), tema terang/gelap. Simpan di klien; sinkron ke akun saat backend prefs ada.
- **Privasi & data (prinsip kepemilikan komunitas):** *unduh data pribadi saya* & *hapus akun* — keduanya **celah backend** (ekspor personal & penghapusan belum ada) → tampilkan dengan penjelasan proses + "segera". Kelola izin lokasi (klien).
- **PWA:** tombol pasang aplikasi + kelola cache offline.

> Prinsip render celah: **jangan** bikin endpoint baru diam-diam di brief ini, dan **jangan** palsukan sukses. Field yang butuh backend → simpan lokal (bila aman) atau state "segera" yang jelas non-fungsional. Kumpulan celah ini jadi input brief backend terpisah (lihat ringkasan di chat).

---

## Sistem desain

Reuse token & komponen dari brief Landing/Dashboard (warna primer dari `desa.warna_primer`, fallback tema bahari). Form dengan validasi inline, state simpan/optimistic + rollback saat gagal, empty/error state ramah, A11y AA, keyboard penuh. Header brand = **Sigerciv** (bukan Kiluan).

---

## Gerbang (uji frontend — pengganti pytest)

- **Dropdown per-state & per-peran:** tamu lihat Masuk/Daftar; terautentikasi lihat item sesuai peran; item fase-terkunci berlabel "segera".
- **PATCH /saya jalan:** ubah nama/telepon/avatar tersimpan; avatar via presigned benar.
- **Ajukan peran:** `POST /desa/{slug}/keanggotaan` → status menunggu tampil.
- **Celah backend aman:** field tanpa endpoint tak pernah menampilkan sukses palsu; consent personalisasi tercatat (lokal) & bisa dicabut.
- **A11y:** axe bersih pada dropdown & halaman akun; kontras AA.
- **Keluar:** memanggil `/auth/keluar` & membersihkan sesi.

---

## Batas / celah backend (untuk brief backend terpisah)

Ubah email + re-verify · ubah kata sandi saat login · daftar sesi aktif · penyimpanan preferensi (minat/tema/bahasa/notifikasi) · push subscription · ekspor data pribadi · hapus akun. Semua tampil "segera" di UI sampai endpoint-nya ada.

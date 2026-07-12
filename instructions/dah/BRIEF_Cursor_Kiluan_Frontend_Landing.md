# Brief Cursor — F-Landing: Halaman Depan (Gerbang) + Mega Menu

**Cakupan:** halaman depan publik `/` (Gerbang) + navigasi utama **mega menu 4 menu**. Marketing-first, mudah dipahami, tanpa data palsu.
**Prasyarat:** F0 hijau (discovery publik: `/discovery/desa`, `/discovery/destinasi`, `/desa/{slug}`, `/desa/{slug}/destinasi`, `/kategori`). F1 opsional bila sudah ada (Pasar Desa, paket, leaderboard). Cuaca BMKG (thin-F2) opsional, fail-soft.
**Rujukan:** `BLUEPRINT §0 Positioning`, `§4 Peta Modul`, `KONTRAK_API_Fase0 §2 & §4 & §7`. Ini murni frontend → **tidak ada scaffold/pytest**; gerbang = uji frontend (lihat bawah).

---

## Langkah 0 — Orientasi repo (WAJIB)

Sebelum menyentuh kode: baca struktur `frontend/` (Next.js App Router, TypeScript, Tailwind, PWA), temukan design tokens/`tailwind.config` + komponen yang sudah ada (jangan duplikasi), dan cek klien API + tipe DTO yang dipakai halaman discovery/spot (F3 brief B3 sebelumnya). Konfirmasi cara ambil `desa.warna_primer` (theming per-tenant, siap F4). `npm run lint`/typecheck hijau. Ringkas: file yang akan disentuh, komponen reusable yang dipakai, dan risiko. **Jangan** ubah kontrak DTO atau util tenant yang sudah ada.

---

## Guardrails khusus halaman depan (jangan dilanggar)

1. **Tanpa perbandingan & tanpa nama pihak lain.** Dilarang menyebut/menyindir platform/OTA lain, dan **dilarang menampilkan nama orang/tokoh**. Pembeda regeneratif dibingkai **positif tentang Kiluan sendiri** ("data milik desa", "nilai kembali ke warga", "dana konservasi transparan") — bukan "lebih baik dari X".
2. **Anti-greenwashing pada angka.** Metrik dampak (mangrove hidup, kg sampah, dst.) baru real setelah F3 (monitoring terverifikasi). Sebelum itu **jangan tampilkan angka mentah/aspirasional seolah fakta**. Gunakan narasi + label "target" atau sembunyikan blok sampai ada data terverifikasi. Sumber angka harus dari endpoint terverifikasi, bukan hard-code.
3. **Publik = hanya konten `publikasi` + `desa aktif`.** Tak ada draft/soft-deleted bocor.
4. **Cuaca** (bila aktif) wajib label **"Sumber: BMKG"** dan fail-soft (kartu hilang, halaman tetap jalan).
5. **SEO & performa:** SSR/ISR untuk konten publik, meta/OG terisi, LCP hero cepat.

---

## Arsitektur Informasi — Mega Menu (tepat 4 menu)

Header sticky: logo **Kiluan** · 4 menu (masing-masing membuka panel mega menu) · tombol **Cari** · **Masuk / Daftar** · tombol **Pasang aplikasi** (PWA install, muncul bila installable). Mobile → menu jadi drawer accordion.

Tiap panel = 2–4 grup tautan + satu *featured tile* (kartu visual dinamis, mis. spot unggulan / owner bersertifikat).

1. **Jelajah** — destinasi & tempat.
   Grup: *Kategori* (Pantai, Snorkeling, Lumba-lumba, Mangrove, Budaya, Kuliner — dari `/kategori`); *Cara jelajah* (Peta, Spot unggulan, Terdekat); *Kalender* (aktivitas musiman, mis. jadwal lumba-lumba pagi).
   Featured: 1 spot unggulan (`/discovery/destinasi`, urut relevansi).

2. **Pengalaman** — paket, layanan, misi.
   Grup: *Paket wisata* (F1, bila ada); *Layanan* (pemandu, penginapan, sewa alat, transport, kuliner, tiket); *Misi Lestari* (Penjelajah Lestari + Paspor Lestari — teaser; aksi penuh F2).
   Featured: 1 paket/pengalaman pilihan; bila F1 belum ada, tampilkan teaser "segera".

3. **Pasar Desa** — UMKM & produk lokal (F1).
   Grup: *Kategori UMKM*; *Owner bersertifikat* (tingkat 🌱 Tunas → 🐚 Bahari → 🐬 Lumba-Lumba); *Produk & jasa*.
   Featured: owner bersertifikat tertinggi. Bila F1 belum ada → seluruh menu tampil "segera" (jangan sembunyikan, beri konteks).

4. **Cerita & Dampak** — komunitas + regeneratif + gabung.
   Grup: *Tentang Kiluan* (kisah desa, kepemilikan komunitas); *Wisata Regeneratif* (apa & kenapa, kode etik lumba-lumba/karang); *Jejak Konservasi* (transparansi dana — **placeholder sampai F3**); *Gabung Komunitas* (daftar sebagai Warga, UMKM, Agen, Pokdarwis).
   Featured: CTA "Gabung komunitas Kiluan".

> Keputusan IA (tradeoff): 4 menu dipilih agar ringkas & mudah dipahami. Konsekuensinya modul Analitik/Neraca (F3) & Nusantara (F4) **tidak** dapat slot menu publik — memang belum publik-siap; ditaruh di footer/dashboard. Alternatif 6 menu ditolak: memecah "Jelajah/Pengalaman" menambah beban kognitif tanpa nilai jelas di fase ini.

---

## Layout halaman depan (urut seksi)

1. **Header/nav** (di atas) — sticky, transparan di hero lalu solid saat scroll.
2. **Hero** — judul kuat berorientasi manfaat ("Berwisata yang meninggalkan Kiluan lebih baik"), subjudul singkat, **search bar** (destinasi/kategori), 2 CTA: *Jelajah* & *Gabung*. Latar: foto laut/mangrove (media utama desa), overlay lembut. Tanpa perbandingan/nama pihak lain.
3. **Chip kategori cepat** — dari `/kategori`, klik → `/[desa]/destinasi?kategori=`.
4. **Spot unggulan** — carousel/grid dari `/discovery/destinasi` (kartu: foto utama, nama, kategori, jarak bila ada).
5. **Kenapa Kiluan** — 3 pilar regeneratif sebagai kartu ikon: *Data milik desa* · *Nilai kembali ke warga* · *Dana konservasi transparan*. Naratif positif, tanpa angka klaim.
6. **Misi Lestari (teaser)** — jelaskan Penjelajah Lestari + Paspor Lestari (belajar → aksi terverifikasi → stempel). CTA lembut; aksi penuh F2.
7. **Pasar Desa (teaser)** — UMKM bersertifikat + penjelasan tingkat Tunas/Bahari/Lumba-lumba (F1).
8. **Paket & pengalaman pilihan** — F1; fallback "segera".
9. **Jejak Regeneratif** — **kondisional**: render blok angka HANYA bila endpoint dampak terverifikasi tersedia (F3). Sebelum itu, ganti dengan naratif komitmen + "transparansi menyusul saat data konservasi terverifikasi".
10. **Ajakan Gabung** — pilih peran (Warga/UMKM/Agen/Pokdarwis) → alur daftar.
11. **Kartu Cuaca & keselamatan** — ringkas, label "Sumber: BMKG", fail-soft.
12. **Footer** — tautan modul, pernyataan kepemilikan komunitas & ekspor data, kontak, ulang tombol Pasang aplikasi (PWA).

---

## Sistem desain

Ambil **warna primer dari `desa.warna_primer`** (token-driven, siap white-label F4); fallback tema bahari: primer teal laut, aksen turquoise, hijau mangrove, latar pasir hangat, netral slate. Semua warna via CSS variable/Tailwind token — jangan hard-code hex di komponen. Tipografi: sans humanis untuk body (mis. yang sudah dipakai repo), display kuat untuk hero. Komponen: kartu spot, kartu owner (dengan lencana tingkat), chip kategori, mega-menu panel, search bar, pita CTA. Motion halus (fade/slide, `prefers-reduced-motion` dihormati). Aksesibilitas AA: kontras, fokus keyboard, alt text media, mega menu navigable via keyboard + ARIA.

---

## Data & sumber per seksi (fail-soft)

Hero/spot/kategori → `/discovery/destinasi`, `/kategori`, `/desa/{slug}`. Pasar/paket → endpoint F1 bila ada, else state "segera". Cuaca → layanan BMKG thin-F2 (cache Redis di backend), fail-soft. Dampak (seksi 9) → hanya bila endpoint regeneratif F3 ada; else naratif. Semua fetch publik SSR/ISR + revalidate wajar; offline-first shell (service worker cache konten yang sudah dibuka).

---

## Gerbang (uji frontend — pengganti pytest)

- **Konten publik saja:** tak ada draft/soft-deleted yang tampil (mock API).
- **Tanpa pelanggaran copy:** uji otomatis memastikan tak ada string nama pihak lain/perbandingan pada landing (daftar kata terlarang + snapshot copy).
- **Tanpa angka palsu:** seksi dampak tidak render bila data terverifikasi absen.
- **Mega menu:** 4 menu, keyboard-navigable, ARIA benar; mobile drawer berfungsi.
- **A11y:** axe bersih pada `/`; kontras AA.
- **PWA:** Lighthouse installable + shell offline; **CLS/LCP** hero layak.
- **Cuaca fail-soft:** BMKG down → kartu hilang, halaman tetap render, label "Sumber: BMKG" saat ada.

---

## Batas (sengaja di luar)

Analitik & Neraca Regeneratif publik (F3), white-label penuh/domain kustom (F4), booking/checkout (Dermaga F2), quest aksi penuh + QR Stasiun Lestari (F2). Di landing semuanya **teaser/naratif**, bukan fungsi transaksional.

# Brief Cursor — F-i18n: Dwibahasa (Indonesia + Inggris)

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung. Fondasi lintas-cabang → **dikerjakan sebelum menambah halaman baru** (retrofit belakangan mahal).
**Cakupan:** infrastruktur i18n ID/EN untuk frontend Next.js (App Router, SSR/ISR, belum PWA). Mayoritas frontend; **satu keputusan menyentuh backend** (terjemahan konten UGC — lihat §Keputusan).
**Rujukan:** brief Landing/Discovery/Kelola/Pasar/Paket/Akun, `KONTRAK_API §1 amplop error (kode)`.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca struktur `frontend/app/`: apakah sudah ada segmen locale, cara rute tenant `/[desa]` disusun, klien API, dan **inventaris string hardcoded** di komponen yang sudah jadi (landing, discovery, dst.). Cek `next.config`, middleware. Typecheck/lint hijau. Ringkas: file/rute yang harus direstrukturisasi + risiko. **Jangan** ubah kontrak API.

---

## Keputusan yang dikunci di brief ini (rekomendasi + tradeoff)

1. **Pustaka: `next-intl`.** Ramah App Router + Server Components + SSR/ISR (yang dibutuhkan SEO discovery). *Alternatif ditolak:* `next-i18next` (era Pages Router), `react-i18next` murni (klien-berat, lemah SSR). Biaya: satu middleware + provider.
2. **Rute ber-prefix locale: `/[locale]/...`** membungkus semua (termasuk `/[locale]/[desa]/...`, `/[locale]/jelajah`). URL berbeda per bahasa → benar untuk SEO (hreflang, indeks terpisah). *Alternatif ditolak:* locale via cookie tanpa prefix (lebih mudah tapi buruk SEO, satu URL dua bahasa). Biaya: `app/` disusun ulang ke `app/[locale]/…` — **justru murah sekarang**, mahal nanti.
3. **String UI → katalog pesan** `messages/id.json` + `messages/en.json`, ber-namespace (`nav`, `landing`, `pasar`, `kelola`, …). Tanpa string hardcoded di komponen.
4. **Label referensi ber-`kode` diterjemahkan di frontend**, bukan backend. `kategori.kode` (`pantai`,`snorkeling`,…), `bidang_usaha.kode`, `jenis`, `status`, `peran`, `tingkat` (`tunas|bahari|lumba_lumba`) semua punya kode stabil → petakan `kode → label` per locale di katalog. **Tanpa perubahan backend.** (Field/enum `snake_case` Indonesia di API tetap — itu kontrak internal, bukan teks tampil.)
5. **Error backend dilokalkan lewat `kode`.** Amplop error sudah punya `kode` stabil (`validasi_gagal`, `tidak_ditemukan`, …) → frontend memetakan ke pesan ID/EN. Catatan jujur: `rincian[].pesan` per-field masih teks Indonesia dari backend → sampai backend melokalkannya, tampilkan pesan generik per-`kode` untuk EN atau biarkan detail ID (flag).
6. **Deteksi & simpan locale:** default `Accept-Language` → override pengguna via **cookie** sekarang; sinkron ke preferensi akun **saat backend prefs ada** (ini menyambung celah "bahasa" di brief F-Akun). Toggle bahasa di header + dropdown pengguna + Akun.
7. **Format:** angka/tanggal/mata uang via ICU (`next-intl`). **Rupiah** `Intl.NumberFormat('id-ID'|'en', {currency:'IDR'})`; tanggal per locale.

---

## Keputusan yang HARUS kamu ambil — konten buatan pengguna (UGC)

Deskripsi destinasi/UMKM/paket/misi ditulis dalam **satu bahasa** (Indonesia). i18n UI **tidak** menerjemahkan ini. Tiga opsi:

- **(A) UGC satu bahasa + UI dwibahasa — REKOMENDASI untuk PkM.** Chrome/label/tombol/marketing dwibahasa penuh; konten tetap bahasa penulis, diberi penanda bahasa. Murah, jujur, standar situs wisata. Frontend-only.
- **(B) Kolom/tabel terjemahan per field.** Simpan `deskripsi_en` dll. → **ubah skema + kontrak + Alembic**, dan butuh orang menulis/merawat terjemahan. Berat; di luar realistis PkM.
- **(C) Terjemahan AI on-demand + cache.** Pas dengan visi "di-tuning AI & sains data" (bisa lewat layanan Pemandu). Butuh endpoint terjemah + cache (Redis) + kontrol biaya/kualitas → **kerja backend**, taruh di roadmap (F2+).

**Rekomendasi:** pakai **(A)** sekarang, siapkan **(C)** sebagai roadmap (jangan hard-code asumsi terjemahan konten di UI). Konfirmasi sebelum implementasi.

---

## Tambahan khusus untuk brief lain (berlaku surut & ke depan)

- **Semua brief** (yang sudah & akan): tak ada string tampil yang hardcoded — semua lewat katalog pesan; tautan pakai helper locale-aware (`Link` yang mempertahankan `[locale]`).
- **Landing:** guardrail "tanpa nama pihak lain / tanpa perbandingan" berlaku untuk **kedua** katalog (id & en) — uji copy jalan di dua bahasa.
- **SEO:** `<html lang>` sesuai locale, tag **hreflang alternate** antar locale, meta/OG per-locale, sitemap per-locale.
- **Discovery/Pasar/Paket detail (SSR/ISR):** render per-locale; label referensi via kode; konten UGC apa adanya (opsi A) + penanda bahasa.
- **F-Akun:** toggle "Bahasa" jadi kontrol nyata locale (cookie), bukan placeholder.

---

## Struktur & scaffold

`app/[locale]/…` (semua halaman pindah ke bawah sini) · `middleware.ts` (deteksi/redirect locale) · `messages/{id,en}.json` (ber-namespace) · `i18n.ts` (config `next-intl`, daftar locale, default `id`) · helper `Link`/`router` locale-aware · util format Rupiah/tanggal. Katalog awal: ekstrak semua string dari halaman yang sudah jadi.

---

## Gerbang (uji frontend — web)

- **Routing:** `/id/…` & `/en/…` render locale benar; tanpa locale → redirect ke default sesuai `Accept-Language`.
- **Persistensi:** ganti bahasa tersimpan (cookie) & bertahan antar navigasi.
- **SSR + SEO:** halaman publik server-rendered per-locale; `<html lang>` benar; **hreflang** alternate ada; meta/OG per-locale.
- **Katalog:** tak ada string hardcoded pada halaman yang sudah diportkan; **key hilang → fallback** ke default, bukan pecah.
- **Label referensi:** kategori/bidang/status/tingkat tampil terjemah via `kode` di kedua locale.
- **Error:** amplop error tampil terlokal via `kode`; fallback aman untuk `rincian` per-field.
- **Format:** Rupiah & tanggal sesuai locale.
- **Copy landing:** guardrail tanpa-perbandingan lolos di id & en.

---

## Batas

Terjemahan konten UGC persisten (opsi B) atau AI on-demand (opsi C) = **kerja backend**, di luar brief ini. Locale ketiga (mis. bahasa daerah) → tinggal tambah katalog + locale bila fondasi ini rapi. Offline katalog → fase PWA.

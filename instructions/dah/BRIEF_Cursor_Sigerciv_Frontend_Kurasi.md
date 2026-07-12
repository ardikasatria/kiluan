# Brief Cursor — F-Kurasi: Dapur Konten (Antrean Kurasi Pengelola)

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung. *(Fase F1.)*
**Cakupan:** sisi **kurator/Pengelola Desa** — antrean **kontribusi** (crowdsource) + antrean **review paket** + penampil **log kurasi**. Satu komponen antrean reusable (transisi seragam).
**Mode:** **Next.js web murni (belum PWA)** — tanpa offline. String lewat katalog i18n (brief F-i18n); label status/aksi via `kode`.
**Prasyarat:** F1 backend hijau (B6/B7). Endpoint: `GET /desa/{slug}/kontribusi[...]`, `.../kontribusi/{id}/transisi`, `GET .../paket`, `.../paket/{id}/transisi`, `GET /desa/{slug}/kurasi/log`.
**Rujukan:** `KONTRAK_API_Fase1 §4 (Dapur Konten) & §6 (state machine) & §8 (DTO) & §9.6 (auto-apply konservatif)`, brief F-Paket.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `frontend/`: shell dashboard + konteks desa/peran, `<BadgeStatus>` (F-Paket), galeri/preview media, klien API + tipe DTO `Kontribusi/KurasiLog/PaketWisata`, keyset, amplop error, dan pola katalog i18n (F-i18n). Typecheck/lint hijau. Ringkas file disentuh + risiko. **Jangan** duplikasi logika transisi/kepemilikan.

---

## Aturan domain yang mengikat UI (jujur)

- **Peran:** hanya **Pengelola Desa** (`pokdarwis`/`perangkat_desa`/`admin`) melihat antrean (tanpa `milik=saya`). Non-pengelola → 403/redirect.
- **Transisi seragam:** semua via `POST .../{entitas}/{id}/transisi { aksi, catatan? }`. Aksi kurator = **`setuju` / `tolak` / `minta_revisi`** (`ajukan` milik penyumbang/agen, bukan di sini). Setiap keputusan menulis satu `kurasi_log`.
- **Transisi ilegal tak ditawarkan** (tombol dirender per status) dan backend menolak `422` — tetap tangani.
- **`arsip` tidak menulis log** (ADR §9.5) — bukan aksi kurator, jangan tampil di panel ini.
- **Auto-apply konservatif (§9.6) — penting:** `setuju` pada **`koreksi_data`/`spot_baru`** **tidak** otomatis memutasi destinasi. Kontribusi jadi "disetujui **tapi belum diterapkan**" — tampilkan status ini jelas + arahan agar pengelola menerapkan manual lewat editor Kelola. Untuk `foto`/`tips`/`ulasan`, `setuju` menampilkan/menempel ke target sesuai backend. Jangan janjikan efek yang tak dilakukan backend.

---

## Antrean Kontribusi

Tab utama di `/[desa]/kelola/kurasi`. List `GET /desa/{slug}/kontribusi?status=&tipe=&target_tipe=` (keyset), default `status=menunggu`. Kartu: tipe (`foto|tips|koreksi_data|spot_baru|ulasan`), target (`destinasi|layanan|umkm|paket_wisata|desa`), penyumbang, ringkas muatan.

**Detail + panel keputusan:** tampilkan `muatan` sesuai tipe (foto → preview media; koreksi_data → `{field, usulan, alasan}` dibandingkan nilai saat ini bila bisa; spot_baru → draft usulan + peta). Panel: **Setujui / Minta Revisi / Tolak** + field `catatan`. **UX:** wajibkan `catatan` untuk *minta_revisi* & *tolak* (opsional untuk setuju).

**Setelah setuju `koreksi_data`/`spot_baru`:** tampilkan banner "disetujui — belum diterapkan" + tombol **Buka editor** (arahkan ke `/[desa]/kelola/destinasi` terkait, prefilled usulan bila memungkinkan; bila tidak, tampilkan usulan berdampingan agar pengelola salin). Ini mencegah crowdsource menulis basis data destinasi tanpa review kedua (anti-vandalism).

---

## Antrean Review Paket

Tab "Paket". List `GET /desa/{slug}/paket?status=review`. Detail = metadata + itinerary terurut (`hari,urutan`) + galeri. Panel keputusan sama (**Setujui → publikasi / Minta Revisi / Tolak** + catatan). `setuju` → paket muncul di Pasar Desa & discovery. Kepemilikan tak relevan di sisi kurator (pengelola berwenang semua), tapi tetap tenant-scoped (desa lain → 404).

---

## Penampil Log Kurasi (audit)

Tab "Log". `GET /desa/{slug}/kurasi/log?entitas_tipe=&entitas_id=` (keyset), read-only. Tampilkan riwayat append-only: entitas, `dari_status→ke_status`, keputusan, kurator, catatan, waktu. Filter per entitas. Ini bukti transparansi kurasi (sejalan misi data-milik-komunitas).

---

## Komponen reusable (buat sekali di sini)

- **`<AntreanKurasi>`** — daftar + filter + keyset, di-parametrisasi `entitas_tipe` (kontribusi/paket, dan nanti `pengajuan_kartu` di brief Naik Kelas Lestari). Karena transisi seragam, satu komponen cukup.
- **`<PanelKeputusan>`** — aksi setuju/tolak/minta_revisi + catatan, guard per status, memanggil endpoint `/transisi`, optimistic + rollback.
- Reuse `<BadgeStatus>` (F-Paket) untuk badge status di semua tab.

---

## Sistem desain

Reuse token & komponen Sigerciv. Layout master-detail (daftar kiri, detail+panel kanan) atau drawer di layar sempit. Label status/aksi/tipe/target via katalog i18n keyed `kode` (ID/EN). A11y AA; empty/loading/error ramah; konfirmasi untuk tolak. Brand **Sigerciv**, label generik "Pengelola Desa".

---

## Gerbang (uji frontend — web, tanpa offline)

- **RBAC:** hanya pengelola melihat antrean; non-pengelola → 403/redirect; resource desa lain → 404.
- **Transisi:** tombol sesuai status; hanya `setuju/tolak/minta_revisi` ditawarkan; ilegal → 422 ditangani; `catatan` wajib pada tolak/minta_revisi.
- **Log tertulis:** setelah keputusan, entri muncul di tab Log (bukti satu keputusan = satu log; `arsip` tak muncul di sini).
- **Auto-apply konservatif:** `setuju` `koreksi_data`/`spot_baru` → status "disetujui, belum diterapkan" + tombol Buka editor; tak ada mutasi destinasi otomatis.
- **Paket:** `setuju` → paket publik; itinerary tampil terurut.
- **i18n:** label status/aksi/tipe terjemah ID/EN via kode; tak ada string hardcoded.
- **A11y:** axe bersih; master-detail keyboard-navigable.

---

## Batas

Validasi **pengajuan kartu (Naik Kelas Lestari)** = brief berikutnya (reuse `<AntreanKurasi>`/`<PanelKeputusan>`). Mekanik "terapkan" otomatis usulan ke destinasi (bila diinginkan lebih dari manual) = keputusan backend, di luar brief ini. Offline entri → fase **PWA**.

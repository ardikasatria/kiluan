# Brief Cursor — F-Dashboard: Dashboard per-Peran (Shell + 8 Peran)

**Cakupan:** shell dashboard ter-RBAC + isi per-peran, dengan **phase-gating jujur** (F0/F1 nyata, thin-F2 terbatas, F3/F4 placeholder). Multi-role + multi-desa.
**Prasyarat:** F0 hijau (auth, `/saya`, `/saya/keanggotaan`, `/peran`, RBAC + scope per-desa). F1 bila ada (Pasar Desa, paket, kurasi, gamifikasi, Naik Kelas Lestari). Thin-F2 (booking/paspor manual) bila ada.
**Rujukan:** `BLUEPRINT §3 Aktor/Peran`, `KONTRAK_API_Fase0 §1 Auth/RBAC & §6 matriks`, `README struktur repo`. Murni frontend di atas API yang ada → **tidak ada scaffold/pytest**; gerbang = uji frontend.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `frontend/`: rute terproteksi/layout auth yang ada, cara resolusi sesi + `/saya/keanggotaan`, design tokens & komponen reusable, klien API. Konfirmasi bentuk data keanggotaan: satu pengguna bisa punya **banyak peran di banyak desa** (`keanggotaan(pengguna, desa, peran, status)`), peran `admin` global (`desa_id=null`). `npm run lint`/typecheck hijau. Ringkas file yang disentuh + risiko. **Jangan** ubah util tenant/auth atau matriks RBAC yang sudah ada — konsumsi, jangan definisikan ulang.

---

## Shell dashboard (dipakai semua peran)

Layout: **sidebar kiri** (nav ter-RBAC) + **topbar** (search kontekstual, notifikasi, profil) + area konten. **Role/desa switcher** di topbar: karena membership multi-peran, pengguna memilih *konteks aktif* (desa + peran) → nav & widget menyesuaikan. `admin` punya switcher lintas-desa.

Prinsip: **nav dirender dari kapabilitas peran aktif**, bukan hard-code per halaman. Setiap rute dashboard punya **route guard**: peran/scope kurang → redirect/403 (klien) + tetap divalidasi backend (klien tak pernah jadi sumber otoritas). Resource desa lain → 404 (konsisten kontrak). Semua request dashboard **terfilter `desa_id` konteks aktif**.

Status keanggotaan `menunggu`/`ditolak` → tampilkan state khusus (belum boleh akses modul kelola), bukan error mentah.

---

## Peran & akses (ringkas; detail di matriks RBAC repo)

8 peran (seed F0): Wisatawan · Pokdarwis · UMKM · Agen Lokal · Kontributor Umum · Organisasi/Mitra · Perangkat Desa · Admin/Steward. Global: `wisatawan`, `kontributor`, `admin`; scoped-desa: sisanya. Widget di bawah **hanya** tampil bila peran+fase memenuhi; selain itu ditandai "segera" dengan konteks (jangan sembunyikan diam-diam).

---

## Dashboard per-peran (widget + phase-gating)

**Wisatawan** — Pesanan/booking saya (thin-F2 manual; else "segera"), Paspor Lestari & stempel (F2), misi berjalan (F2), wishlist/simpanan, kontribusi saya + status kurasi (F1), poin & badge (F1). *F0:* baru profil + simpanan; sisanya gate per fase.

**Pokdarwis** — Kelola destinasi/layanan/kalender (F0, nyata), antrean **Dapur Konten** (kurasi kontribusi & paket, F1), panel validasi **Naik Kelas Lestari** (F1), persetujuan keanggotaan desa (F0), pengaturan desa (F0). Ringkasan kunjungan & dana konservasi = **placeholder F3** (label jelas, tanpa angka palsu).

**UMKM** — Produk/jasa saya (F1), pesanan masuk (thin-F2 manual), progres **Naik Kelas Lestari** (kartu aksi + tingkat, F1), profil & status verifikasi (F0/F1). Performa ringkas = placeholder F3.

**Agen Lokal** — Editor **paket wisata** + state machine draft→review→publish (F1), kuota & jadwal (F1), pesanan paket (thin-F2), progres sertifikasi. F0: profil saja.

**Kontributor Umum** — Kontribusi (foto/tips/koreksi) + status kurasi (F1), poin/badge/leaderboard (F1), misi kontribusi. F0: profil + riwayat kontribusi kosong.

**Organisasi/Mitra** — Program konservasi, data ekologi/monitoring (F3), sponsor/reinvestment (F3), laporan dampak (F3). **Mayoritas placeholder** sampai F3; F0/F1 tampilkan profil + kanal kontak/kolaborasi.

**Perangkat Desa** — Persetujuan keanggotaan & legitimasi (F0), tata kelola & transparansi **dana konservasi** (F3), daya dukung per spot lampu hijau/kuning/merah (F3), laporan desa (F3). F0/F1: verifikasi + tautan tata kelola.

**Admin/Steward** — Moderasi lintas-desa, kelola peran & keanggotaan, konfigurasi platform, kesehatan sistem. Provisioning desa/white-label = **placeholder F4**. Ini satu-satunya peran dengan switcher lintas-desa.

> Tradeoff jujur: karena PkM realistis tuntas di **F0 + F1 + thin-F2**, sebagian besar dashboard Organisasi/Perangkat Desa dan blok analitik/dana/neraca **belum berdata**. Pilihan diambil: render sebagai kartu "segera + kenapa" (transparan) daripada menyembunyikan (membingungkan) atau menampilkan angka dummy (greenwashing / menyesatkan). Placeholder harus jelas non-fungsional.

---

## Sistem desain

Reuse token & komponen dari brief Landing (warna primer dari `desa.warna_primer`, tema bahari fallback). Komponen dashboard: kartu-metrik (dengan state kosong/segera), tabel ter-paginate keyset, form kelola (destinasi/produk/paket), antrean kurasi (kartu keputusan), lencana tingkat (Tunas/Bahari/Lumba-lumba), progres kartu aksi. **Grafik (ECharts/Plotly)** hanya untuk widget F3 → di fase ini render *placeholder skeleton*, jangan tarik lib berat sebelum ada data. A11y AA, keyboard, offline-first untuk entri lapangan (form monitoring/kontribusi tersimpan lokal, sinkron tertunda — IndexedDB + antrean).

---

## Data & sumber + catatan backend (jujur soal celah)

Dashboard membaca endpoint modul yang sudah ada (`/desa/{slug}/destinasi`, produk/paket/kontribusi/kurasi/leaderboard F1, dst.) terfilter peran+desa. **Belum ada** endpoint ringkasan per-peran (counter untuk kartu-metrik): untuk fase ini **rakit di klien** dari list yang ada (hemat, hindari over-fetch besar). Bila jadi hotspot, usulkan `GET /desa/{slug}/dashboard/ringkasan` (role-scoped) sebagai brief backend terpisah — **jangan** diam-diam bikin endpoint baru di brief ini. Widget F3/F4 tak punya sumber → placeholder.

---

## Gerbang (uji frontend — pengganti pytest)

- **Route guard per peran:** tiap peran hanya melihat nav & rute yang diizinkan; akses paksa rute terlarang → 403/redirect (uji semua 8 peran via sesi mock).
- **Isolasi tenant klien:** switch desa mengubah scope; resource desa lain → 404.
- **Multi-role switcher:** ganti konteks peran/desa merender ulang nav & widget benar.
- **Status keanggotaan:** `menunggu`/`ditolak` menampilkan state khusus, bukan modul kelola.
- **Phase-gating:** widget F2/F3/F4 render sebagai placeholder jelas (bukan angka dummy, bukan hilang senyap).
- **A11y + offline:** axe bersih; form lapangan menyimpan offline & sinkron saat online kembali.

---

## Batas (sengaja di luar)

Transaksi/checkout & disbursement (Dermaga F2 penuh), quest aksi + QR Stasiun Lestari (F2), analitik medallion & dashboard tren, daya dukung, dana konservasi, Neraca Regeneratif (F3), provisioning/white-label/ekspor (F4). Semua tampil sebagai placeholder ter-scope peran sampai fasenya aktif.

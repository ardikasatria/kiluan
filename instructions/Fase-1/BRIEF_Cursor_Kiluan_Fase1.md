# Brief Cursor — Fase 1 Kiluan (B5/F5 … B8/F8)

**Untuk:** agen Cursor (backend + frontend berpasangan).
**Prasyarat:** F0 tuntas & hijau (B0–B4): migrasi bootstrap 13 tabel F0, auth/RBAC, destinasi+geo, discovery, media MinIO. Stack **async** (ADR-0003).
**Rujukan wajib (`docs/` / Project Knowledge):** `BLUEPRINT_Platform_Desa_Wisata_Regeneratif.md`, `ERD_Kiluan_Fase1.md`, `KONTRAK_API_Kiluan_Fase1.md`, dan **scaffold F1** `scaffold_kiluan_f1/` (domain `kiluan_f1/` — models + enums + mesin_status + service + repo memori, **28 pytest hijau**).
**Prinsip:** blueprint-first, multi-tenant per-`desa_id`, enum di aplikasi **+ CHECK** (bukan ENUM native Postgres), soft delete pada konten, snake_case Bahasa Indonesia, **tak ada perubahan skema tanpa Alembic**, lintas-tenant → **404 bukan 403**.

> **Cara pakai.** Kerjakan **berurutan** B5→B6→B7→B8 (ada dependensi tulis-poin, lihat peta di bawah). Backend (`B*`) & frontend (`F*`) satu nomor boleh paralel: frontend memakai mock kontrak sampai backend siap. Setiap pasangan **WAJIB** dibuka dengan **Langkah 0**.

---

## Langkah 0 — Orientasi repo (template, tempel di awal SETIAP brief)

Sebelum menyentuh kode, agen:
1. Membaca `docs/ERD_Kiluan_Fase1.md` + `docs/KONTRAK_API_Kiluan_Fase1.md` untuk modul yang disentuh brief ini, dan bagian scaffold `kiluan_f1/layanan/<modul>.py` yang akan diwujudkan.
2. Memetakan repo pasca-F0: `backend/app/{domain,skema,layanan,repo,model,api,inti}`, `frontend/app`, `infra/`. Catat file **disentuh** vs **rujukan**. Pola acuan tetap: `app/repo/sql.py` (mapping ORM↔domain), `app/api/deps.py` (`resolusi_desa`/`wajib_peran`), `app/inti/*` (adapter ber-gate).
3. Konvensi wajib: filter `desa_id` di **semua** query domain; amplop error `{"galat":{"kode","pesan","rincian"}}`; lintas-tenant→404; publik hanya `status` layak-tayang & `dihapus_pada IS NULL`; keyset `?batas=&kursor=`; **kepemilikan** (F1 baru: owner UMKM/agen/penyumbang hanya menyentuh miliknya, pengelola melewati).
4. `cd backend && pytest -q` harus **hijau** (unit memori F0 + F1 yang sudah diport). Jangan pecahkan.
5. **Jangan** ubah `app/domain/**` (models) & `app/skema/**` (DTO) F1 kecuali brief memerintah eksplisit — itu kontrak teruji. Perubahan perilaku lewat `layanan/` + `repo/` + `api/`.
6. Setiap perubahan skema = **migrasi Alembic increment** (bukan `create_all`, bukan edit bootstrap F0). Uji `upgrade head` lalu `downgrade` ke revisi F0 bersih.

Keluaran Langkah 0: ringkasan 5–10 baris (file dibuat/diubah + risiko) sebelum ngoding.

---

## Peta ketergantungan F1 (kenapa urutannya begini)

```
B5 (Migrasi F1 + Award engine/Lencana)  ← fondasi: semua modul menulis transaksi_poin
   ├──► B6 (Pasar Desa)      award: produk_terdaftar, paket_dipublikasi
   ├──► B7 (Dapur Konten)    award: kontribusi_disetujui
   └──► B8 (Naik Kelas)      konsumsi kartu tervalidasi → sertifikasi → boost ranking B6
```

**Migrasi front-loaded (keputusan):** satu migrasi increment `0002_f1` di B5 membuat **seluruh 13 tabel F1 + 2 ALTER F0 + seed lookup** sekaligus, sehingga B6–B8 **tidak menyentuh skema** (hanya tambah repo/endpoint/UI). Tradeoff: satu migrasi "gemuk" vs per-modul. Dipilih satu increment karena ERD F1 dikunci sebagai satu unit → `upgrade`/`downgrade` atomik & mudah dibalik. Alternatif per-modul ditolak (empat migrasi berantai lebih rapuh saat rollback parsial).

**ALTER F0 (butuh migrasi, bukan bootstrap):** `layanan.umkm_id` UUID FK→umkm (nullable); `media_lampiran.entitas_tipe` + nilai `umkm|produk_jasa|paket_wisata|kontribusi` (perluas CHECK, bukan tabel baru).

---

## Pasangan B5/F5 — Migrasi F1 + Lencana Warga (award engine)

**Tujuan.** Fondasi F1 hidup: seluruh tabel F1 ter-migrasi + seed, dan **substrat poin/badge** aktif — ledger idempoten, badge otomatis, leaderboard. Modul berikutnya tinggal memanggil `poin.award(...)`.

### B5 (backend)
Langkah 0, lalu:
- **Migrasi `0002_f1`** (increment di atas revisi F0): buat 13 tabel F1 (`bidang_usaha, umkm, produk_jasa, paket_wisata, paket_item, kontribusi, kurasi_log, aturan_poin, transaksi_poin, badge, badge_pengguna, kartu_aksi, pengajuan_kartu, sertifikasi_owner`) — cocokkan dengan `model/tabel.py` increment. Wajib:
  - **CHECK** untuk tiap enum ERD §4 (bukan ENUM native).
  - **GIST** pada `umkm.lokasi`.
  - **UNIQUE**: `paket_wisata(desa_id, slug)`; `transaksi_poin(pengguna_id, kode_aksi, referensi_tipe, referensi_id)`; `badge_pengguna(pengguna_id, badge_id)`; `sertifikasi_owner(desa_id, subjek_tipe, subjek_id)`.
  - **ALTER F0**: `layanan.umkm_id`; perluas CHECK `media_lampiran.entitas_tipe`.
  - **Seed lookup**: `bidang_usaha` (kuliner, kerajinan, homestay, jasa_wisata, hasil_laut, …), `aturan_poin` global (`kontribusi_disetujui`, `produk_terdaftar`, `paket_dipublikasi`, `profil_lengkap`, `warga_perintis`), `badge` awal (3 tingkat), `kartu_aksi` template baku (`desa_id=null`). Nilai seed = samakan dengan `kiluan_f1/seed.py`.
  - Uji `upgrade head` → `downgrade` ke revisi F0 bersih (drop rapi, urutan FK benar).
- **`repo/sql.py`** +`RepoAturanPoin/TransaksiPoin/Badge/BadgePengguna` — **signature 1:1** dengan `repo/memori.py`. **Idempotensi di DB:** `award` pakai `INSERT … ON CONFLICT (pengguna_id,kode_aksi,referensi_tipe,referensi_id) DO NOTHING` dan kembalikan `False` bila 0 baris (jangan andalkan read-then-write — rawan race). `badge_pengguna` sama (`ON CONFLICT DO NOTHING`).
- **Wujudkan** `layanan/lencana_warga.py` (sudah async & teruji) ke endpoint (KONTRAK §5): `GET /desa/{slug}/poin/saya`, `/leaderboard?periode=`, `/badge`, `/badge/saya`, `/aturan-poin`, dan global `GET /bidang-usaha`.
- **Tes:** unit `test_lencana_warga` port dari scaffold tetap hijau; **integrasi** thd Postgres uji: award ganda (referensi sama) → satu baris (uji constraint, bukan hanya cek Python); badge ter-award saat syarat terpenuhi, tak berganda; leaderboard agregat benar; isolasi `desa_id`.

### F5 (frontend)
Langkah 0, lalu:
- `/[desa]/saya/lencana`: saldo poin + riwayat (keyset "muat lagi") + koleksi badge (dimiliki vs terkunci, tampilkan `syarat`).
- `/[desa]/leaderboard`: papan peringkat desa (`periode=all|30h|7h`), nama+avatar saja.
- Komponen `<BadgeChip>` & `<PoinRingkas>` reusable (dipakai profil & Pasar Desa nanti).
- **Gerbang:** saldo & badge sinkron dgn backend B5; leaderboard ganti periode benar; tak ada PII di papan publik.

**Batas:** aturan poin belum bisa diedit dari UI (seed cukup untuk F1; CRUD aturan → brief admin bila perlu).

---

## Pasangan B6/F6 — Pasar Desa (Kolaborasi Ekosistem)

**Tujuan.** UMKM (verifikasi), produk/jasa (publikasi ter-gate), paket wisata (state machine + itinerary). Award `produk_terdaftar` & `paket_dipublikasi` menyala lewat substrat B5.

### B6 (backend)
Langkah 0, lalu:
- **`repo/sql.py`** +`RepoUmkm/ProdukJasa/PaketWisata/PaketItem/KurasiLog/BidangUsaha` (signature 1:1 memori). Pencarian UMKM `?dekat=` pakai **PostGIS `ST_DWithin`** + GIST (samakan pola B2; sertakan `jarak_m`, urut jarak).
- **Wujudkan** `layanan/pasar_desa.py` ke endpoint (KONTRAK §3): UMKM (daftar/ubah/`/verifikasi`/soft-delete), Produk (buat/ubah/`/status`/soft-delete), Paket (buat/ubah/`/transisi`/soft-delete) + itinerary (`/item` POST/PATCH/DELETE).
- **Aturan kunci yang harus faithful ke scaffold:**
  - Produk `→publikasi` **ditolak 422** bila UMKM ≠ `terverifikasi`.
  - `paket_item` menolak 422 bila tanpa referensi **dan** tanpa `judul`; referensi (`destinasi_id/layanan_id/produk_jasa_id`) wajib **se-tenant & hidup** (query cek → lintas-desa 404).
  - **State machine paket** (`/transisi {aksi}`): `ajukan` hanya owner agen; `setuju|tolak|minta_revisi` hanya pengelola; **`arsip` = lifecycle owner, TIDAK menulis `kurasi_log`** (ADR §9.5). Tiap transisi kurasi menulis satu `kurasi_log`.
  - Award: `produk_terdaftar`→pemilik UMKM saat produk dibuat; `paket_dipublikasi`→agen saat `setuju→publikasi` (referensi unik → idempoten).
  - Kepemilikan: agen hanya paketnya, owner hanya UMKM/produknya; pengelola semua.
- **Tes:** unit `test_pasar_desa` port hijau; integrasi: transisi ilegal 422; `arsip` tak menulis log; slug paket `(desa_id,slug)` bentrok→409; publikasi-gate UMKM; award idempoten thd DB.

### F6 (frontend)
Langkah 0, lalu:
- **Direktori Pasar Desa** `/[desa]/pasar`: daftar UMKM & produk publik (filter `bidang`, cari, `dekat`), kartu produk. Urutan default = fungsi (`sertifikasi.tingkat` desc, rating, **kebaruan**) — lihat catatan boost B8.
- **Dashboard UMKM** (peran umkm): daftar/kelola profil UMKM, editor produk (draft→publikasi, disable tombol publikasi + tooltip bila belum terverifikasi), galeri via lampiran `entitas_tipe=produk_jasa`.
- **Editor Paket** (peran agen): form paket + **penyusun itinerary** (drag `hari`/`urutan`, pilih destinasi/layanan/produk atau item bebas), tombol **Ajukan**; badge status (draft/review/publikasi/ditolak/arsip).
- **Antrean kurasi paket** (pengelola): setujui/tolak/minta_revisi + catatan.
- **Offline-first**: pendaftaran UMKM & entri produk dari lapangan → antrean sinkron tertunda (IndexedDB).
- **Gerbang:** UMKM belum terverifikasi tak bisa publikasi (UI + backend sepakat); agen bisa draft→ajukan→(pengelola) publikasi; itinerary tersimpan terurut.

**Batas:** penjadwalan per-tanggal & kuota harian paket → **F2 Dermaga** (booking). Pembayaran → F2.

---

## Pasangan B7/F7 — Dapur Konten (Kurasi Crowdsource)

**Tujuan.** Kontribusi warga/wisatawan (foto/tips/koreksi/spot_baru/ulasan) → alur kurasi → award `kontribusi_disetujui`. Audit `kurasi_log` generic.

### B7 (backend)
Langkah 0, lalu:
- **`repo/sql.py`** +`RepoKontribusi` (KurasiLog sudah dari B6). Polimorфik `target_tipe/target_id` **dijaga aplikasi** (validasi tipe + eksistensi + se-tenant di service; tak ada FK keras → wajib uji kebocoran).
- **Wujudkan** `layanan/dapur_konten.py` (KONTRAK §4): `POST /kontribusi`, `GET /kontribusi?…&milik=saya`, `GET /kontribusi/{id}`, `PATCH /kontribusi/{id}` (revisi muatan saat `revisi`), `POST /kontribusi/{id}/transisi`, `GET /kurasi/log`.
- **State machine kontribusi**: `setuju|tolak|minta_revisi` hanya pengelola; `ajukan` (kirim ulang `revisi→menunggu`) hanya penyumbang. Setiap transisi → `kurasi_log`.
- **Efek `setuju→disetujui`:** award `kontribusi_disetujui`→penyumbang (referensi=(kontribusi,id), idempoten) + evaluasi badge. **Auto-apply KONSERVATIF (ADR §6.2/§9.6):** `foto`→lampirkan media ke target; `tips/ulasan`→tersimpan & tampil di detail target; **`koreksi_data`/`spot_baru` TIDAK memutasi `destinasi`** — hanya ditandai `disetujui` + muncul sebagai saran "terapkan" di panel pengelola. `foto` wajib `media_id` (422 bila kosong).

> **Keputusan yang harus dikunci SEBELUM B7:** apakah saran "terapkan" cukup sebagai flag di `kontribusi` (status `disetujui` + query panel), atau perlu **entitas antrean penerapan** tersendiri di ERD. Rekomendasi F1: cukup flag (hemat, tak ubah ERD); entitas terpisah baru bila volume koreksi tinggi. Putuskan bersama Satria; bila pilih entitas → migrasi increment tambahan sebelum lanjut.

- **Tes:** unit `test_dapur_konten` port hijau; integrasi: award idempoten (setuju dua kali → poin sekali); revisi→kirim ulang→menunggu; transisi ilegal 422; kurasi butuh pengelola (403); target lintas-desa 404.

### F7 (frontend)
Langkah 0, lalu:
- **Form kontribusi** kontekstual dari detail spot/UMKM/paket (`target_tipe/id` terisi otomatis): foto (uploader presigned F0), tips, koreksi data (diff usulan), usul spot baru, ulasan.
- **Antrean kurasi** (pengelola): daftar `menunggu`, aksi setuju/tolak/minta_revisi + catatan; untuk koreksi/spot_baru tampilkan tombol **"Terapkan"** (arahkan ke editor destinasi B2, bukan mutasi otomatis).
- **Riwayat kontribusi saya** (`milik=saya`) lintas status + poin yang didapat.
- **Offline-first**: kontribusi lapangan (foto+lokasi) tersimpan lokal, sinkron tertunda.
- **Gerbang:** kontribusi disetujui menambah poin penyumbang (terlihat di lencana); non-pengelola tak melihat antrean; koreksi disetujui tak diam-diam mengubah destinasi (butuh langkah pengelola).

**Batas:** verifikasi berbukti (QR/monitoring) → **F3**; di F1 kurasi = penilaian manusia.

---

## Pasangan B8/F8 — Naik Kelas Lestari (seed Misi Kiluan sisi owner)

**Tujuan.** Sertifikasi regeneratif owner: katalog kartu aksi + edukasi, pengajuan bukti + validasi (state machine), sertifikasi `tunas/bahari/lumba_lumba`, boost ranking Pasar Desa.

### B8 (backend)
Langkah 0, lalu:
- **`repo/sql.py`** +`RepoKartuAksi/PengajuanKartu/SertifikasiOwner`. **Upsert sertifikasi** pakai `INSERT … ON CONFLICT (desa_id,subjek_tipe,subjek_id) DO UPDATE` (single-writer via transaksi).
- **Wujudkan** `layanan/naik_kelas.py` (KONTRAK §7): `GET /kartu-aksi`, `/kartu-aksi/{id}`, `POST /pengajuan-kartu`, `GET /pengajuan-kartu?…&milik=saya`, `GET /pengajuan-kartu/{id}`, `PATCH /pengajuan-kartu/{id}` (revisi bukti), `POST /pengajuan-kartu/{id}/transisi`, `GET /sertifikasi?subjek_tipe=&subjek_id=`.
- **Aturan faithful ke scaffold:**
  - Validasi bukti vs `kartu.bukti_dibutuhkan` (422 bila kurang). Cegah pengajuan ganda kartu hidup/tervalidasi untuk subjek (409).
  - State machine: `setuju(=validasi)|tolak|minta_revisi` hanya validator (pengelola); `ajukan` (kirim ulang) hanya owner subjek. Tiap transisi → `kurasi_log(entitas_tipe='pengajuan_kartu')`.
  - `setuju→tervalidasi`: set `validator_id`/`divalidasi_pada`, **hitung ulang** `skor=Σ bobot kartu tervalidasi` → tentukan `tingkat` via ambang → upsert `sertifikasi_owner`.
  - **Wire boost ranking B6:** query listing UMKM/produk join `sertifikasi_owner`, `ORDER BY tingkat DESC, …`.
- **Tes:** unit `test_naik_kelas` port hijau; integrasi: bukti tak lengkap 422; validasi menaikkan skor & upsert tingkat sesuai ambang; kartu sama dihitung sekali; validasi butuh pengelola (403); ranking Pasar Desa terurut tingkat.

### F8 (frontend)
Langkah 0, lalu:
- **Katalog kartu** `/[desa]/naik-kelas`: kartu aksi + modul **edukasi** (`kenapa_penting`) — owner belajar dulu; indikator bukti yang diminta.
- **Ajukan kartu** (owner umkm/agen/pokdarwis): unggah bukti sesuai `bukti_dibutuhkan`; lacak status pengajuan (menunggu/tervalidasi/ditolak/revisi) + revisi.
- **Panel validasi** (pengelola): antrean pengajuan, validasi/tolak/minta_revisi + catatan.
- **Lencana tingkat** 🌱 Tunas → 🐚 Bahari → 🐬 Lumba-Lumba di profil UMKM & kartu Pasar Desa; halaman `sertifikasi` publik per-owner.
- **Gerbang:** validasi kartu menaikkan tingkat owner; tingkat tampil di Pasar Desa & memengaruhi urutan.

> **Boost ranking — catatan tata kelola (ADR §9.7, BUKAN sekadar `ORDER BY`).** Mengurutkan Pasar Desa murni berdasar tingkat berisiko *rich-get-richer*: owner Tunas terkubur, melawan misi regeneratif-inklusif. **Rekomendasi implementasi:** campur `tingkat` dengan **kebaruan + rotasi eksposur** (mis. slot acak-tertimbang untuk owner baru) dan pantau distribusi tampilan. Ambang tingkat & daftar "kartu wajib" untuk Bahari adalah **input tata kelola Pokdarwis** — konfirmasi angka sebelum go-live, jangan hard-code sepihak.

**Batas:** loop verifikasi berbukti penuh (Stasiun Lestari/QR, monitoring survival) → **F3**; sisi wisatawan Misi (Paspor/Stempel/Penjelajah Lestari) → **F2**.

---

## Penutup F1 & langkah selanjutnya

```
B5/F5 ──► B6/F6 ──► B7/F7 ──► B8/F8
  (award engine)  (Pasar)   (Konten)  (Naik Kelas + boost B6)
```

1. **Eksekusi B5→B8 berurutan** di Cursor; tiap pasangan hijaukan gerbang (subset KONTRAK §10) sebelum lanjut. Simpan keputusan sebagai **ADR** pendek di `docs/adr/`: migrasi front-loaded, idempotensi via `ON CONFLICT`, auto-apply konservatif, boost ranking anti-rich-get-richer.
2. **Tutup F1**: jalankan seluruh gerbang `pytest` §10 (unit memori + integrasi Postgres/PostGIS). Data seed nyata: ≥20 UMKM terinput, ≥beberapa paket publikasi, kartu aksi baku aktif.
3. **Keputusan yang harus dikunci sebelum ngoding modul terkait** (jangan diam-diam diputuskan agen):
   - B7: saran "terapkan" = flag di `kontribusi` **atau** entitas antrean tersendiri (default: flag).
   - B8: ambang skor tingkat + daftar kartu wajib Bahari (input Pokdarwis).
4. **Menuju F2 (thin slice PkM):** ERD F2 (Dermaga escrow + Pemandu + wisatawan Misi) sudah dirancang. **Blocker non-teknis** yang harus tuntas paralel sebelum menyalakan transaksi F2: FGD tata kelola **dana konservasi & `persen_reinvestasi`** dengan Pokdarwis/perangkat desa. Untuk PkM: aktifkan pembayaran **manual** (transfer + verifikasi) dulu, tunda disbursement/refund otomatis.

> Catatan: seluruh endpoint F1 sudah ber-slug/tenant → RLS per-desa (F4) = tambah kebijakan DB, bukan refactor. `layanan.umkm_id` & perluasan `media_lampiran.entitas_tipe` sudah ditangani migrasi `0002_f1` di B5.

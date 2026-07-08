# Brief Cursor — Fase 2 Kiluan (B9/F9 … B13/F13)

**Untuk:** agen Cursor (backend + frontend berpasangan).
**Prasyarat:** F0 & F1 tuntas hijau (B0–B8): 13 tabel F0 + 13 tabel F1 + 2 ALTER F0, auth/RBAC, destinasi+geo, discovery, media MinIO, Pasar Desa, Dapur Konten, Lencana Warga, Naik Kelas. Stack **async** (ADR-0003). Migrasi terakhir = `0002_f1`.
**Rujukan wajib (`docs/` / Project Knowledge):** `BLUEPRINT_Platform_Desa_Wisata_Regeneratif.md`, `ERD_Kiluan_Fase2.md`, `KONTRAK_API_Kiluan_Fase2.md`, **ADR-02 (escrow)**, dan **scaffold F2** `scaffold_kiluan_f2/` (domain `kiluan_f2/` — models + enums + `layanan_*` + repo memori, **33 pytest hijau**). Perilaku service di scaffold = spesifikasi perilaku yang harus faithful; 33 uji = kontracuan regresi.
**Prinsip:** blueprint-first, multi-tenant per-`desa_id`, enum di aplikasi **+ CHECK** (bukan ENUM native), soft delete pada konten, ledger uang **append-only**, **idempotensi wajib pada uang & poin**, snake_case Bahasa Indonesia, **tak ada perubahan skema tanpa Alembic**, lintas-tenant → **404 bukan 403**.

> **Cara pakai.** Kerjakan **berurutan** B9→B13 (dependensi tulis: semua modul menulis ke Dermaga/pengaturan). Backend (`B*`) & frontend (`F*`) satu nomor boleh paralel (frontend pakai mock kontrak sampai backend siap). Setiap pasangan **WAJIB** dibuka dengan **Langkah 0**.
> **Guardrail PkM (8 bln / Rp20jt):** yang wajib tuntas untuk PkM = **thin slice** → B9 (checkout+booking) + B10 **jalur manual saja** + B12 (Penjelajah QR). Escrow disbursement/refund otomatis (B10 lanjut), kupon lanjutan (B11), dan Pemandu (B13) **boleh menyusul**. Jangan over-promise; petakan sisanya ke roadmap Tahun 4–5.

---

## Langkah 0 — Orientasi repo (template, tempel di awal SETIAP brief)

Sebelum menyentuh kode, agen:
1. Membaca `docs/ERD_Kiluan_Fase2.md` + `docs/KONTRAK_API_Kiluan_Fase2.md` untuk modul yang disentuh brief ini, dan bagian scaffold `kiluan_f2/layanan_<modul>.py` + uji `tests/test_<modul>.py` yang akan diwujudkan.
2. Memetakan repo pasca-F1: `backend/app/{domain,skema,layanan,repo,model,api,inti}`, `frontend/app`, `infra/`. Catat file **disentuh** vs **rujukan**. Pola acuan tetap: `app/repo/sql.py` (mapping ORM↔domain), `app/api/deps.py` (`resolusi_desa`/`wajib_peran`/`kepemilikan`), `app/inti/*` (adapter ber-gate).
3. Konvensi wajib: filter `desa_id` di **semua** query domain; amplop error `{"galat":{"kode","pesan","rincian"}}`; lintas-tenant→404; publik hanya entitas layak-tayang & `dihapus_pada IS NULL`; keyset `?batas=&kursor=`; kepemilikan (penyedia hanya subjek/transaksi/rekeningnya, pengelola melewati). **Baru F2:** header `Idempotency-Key` pada POST uang/poin; transisi uang **bukan** verba klien (hanya webhook/aksi-manusia-berperan).
4. `cd backend && pytest -q` harus **hijau** (unit memori F0+F1). Jangan pecahkan.
5. **Jangan** ubah `app/domain/**` & `app/skema/**` F0/F1 kecuali brief memerintah eksplisit — itu kontrak teruji. Perubahan perilaku lewat `layanan/` + `repo/` + `api/`.
6. Setiap perubahan skema = **migrasi Alembic increment** (bukan `create_all`, bukan edit bootstrap/`0002_f1`). Uji `upgrade head` → `downgrade` ke revisi F1 bersih.

Keluaran Langkah 0: ringkasan 5–10 baris (file dibuat/diubah + risiko) sebelum ngoding.

---

## Keputusan yang HARUS dikunci sebelum ngoding (jangan diputuskan diam-diam oleh agen)

1. **Alokasi diskon kupon ke split escrow.** Scaffold F2 sengaja **tidak** mengalokasikan diskon ke `bruto` per penyedia (`bruto = Σ subtotal pra-diskon`); sumber pendanaan diskon dibiarkan terbuka. **Rekomendasi:** untuk PkM, kupon `promo_owner` mengurangi `bruto` penyedia bersangkutan (owner menanggung promonya), kupon `kampanye`/`tukar_poin` ditanggung **dana kampanye desa** (tak mengurangi `neto_penyedia`) — artinya diskon kampanye = pos pengeluaran terpisah, bukan potong penyedia. Kunci angka & sumber dana bersama Satria **sebelum B10/B11**; ini memengaruhi baik ledger maupun invarian split.
2. **`persen_reinvestasi` & tata kelola dana escrow — BLOCKER FGD non-teknis.** Wajib disepakati FGD Pokdarwis/perangkat desa **sebelum go-live**: besaran `persen_reinvestasi`, syarat rilis escrow, kebijakan pembatalan. `PATCH /pengaturan` ada, tapi **jangan hard-code nilai sepihak**; seed default hanya placeholder ber-flag "belum disahkan".
3. **Gateway final (Xendit vs Midtrans+Iris) = ADR terpisah saat integrasi.** B10 dibangun **agnostik** (`penyedia_gateway`, `konfig_gateway`, `ref_eksternal`) dan **manual-first**. Jangan integrasi SDK gateway di PkM tanpa keputusan ADR.

---

## Peta ketergantungan F2 (kenapa urutannya begini)

```
B9  (Migrasi F2 + Pengaturan Desa + Dermaga inti: slot→checkout→booking→pembayaran)
     └──► B10 (Escrow ledger + payout + refund + rekening + webhook)   ← settle di atas pembayaran B9
            ├──► B11 (Kupon & Tukar Poin)        ← diskon dipakai di checkout B9, split di B10
            └──► B12 (Penjelajah Lestari + Verifikasi)  ← booking B9 menaut stempel; poin dari B5
     └──► B13 (Pemandu rule-based)               ← baca slot/katalog B9, stateless-ish
```

**Migrasi front-loaded (keputusan, pola sama B5).** Satu increment `0003_f2` di B9 membuat **seluruh tabel F2 sekaligus** (Dermaga 22 + kupon/poin + Penjelajah + Pemandu + `verifikasi` + `pengaturan_desa`) + seed, sehingga B10–B13 **tidak menyentuh skema** (hanya tambah repo/endpoint/UI). Tradeoff: satu migrasi "gemuk" vs per-modul. Dipilih satu increment karena ERD F2 dikunci sebagai satu unit → `upgrade`/`downgrade` atomik. Alternatif per-modul ditolak (rantai migrasi rapuh saat rollback parsial).

---

## Pasangan B9/F9 — Migrasi F2 + Pengaturan Desa + Dermaga inti

**Tujuan.** Fondasi transaksi hidup: seluruh tabel F2 ter-migrasi + seed; checkout multi-penyedia dengan **hold kuota anti-overbook**, booking + QR check-in, dan pembayaran (jalur **manual** dulu). Ini inti thin-slice PkM.

### B9 (backend)
Langkah 0, lalu:
- **Migrasi `0003_f2`** (increment di atas `0002_f1`) — seluruh tabel F2 (ERD F2). Wajib:
  - **CHECK** tiap enum ERD §4 (bukan ENUM native).
  - **CHECK invarian uang** pada `transaksi`: `bruto = fee_platform + porsi_reinvestasi + neto_penyedia` (berlaku juga untuk baris refund negatif). Ini mengunci split di level DB, bukan hanya service.
  - **GIST** pada `stasiun_lestari.lokasi`.
  - **UNIQUE**: `pesanan.kode_pesanan`; `booking(pesanan_item_id)`; `booking.kode_checkin`; `pembayaran(penyedia_gateway, ref_eksternal)`; `webhook_pembayaran.event_id`; `slot_jadwal(subjek_tipe, subjek_id, tanggal, waktu_mulai)`; `pemakaian_kupon(kupon_id, pesanan_id)`; `kupon.kode`; `katalog_hadiah.kode`; `stasiun_lestari.qr_token`; `paspor_lestari(desa_id, pengguna_id)`.
  - **Seed**: `pengaturan_desa` untuk desa flagship dengan **default ber-flag "belum disahkan FGD"** (`persen_reinvestasi`, `persen_fee_platform`, `batas_hold_menit`, `gateway="manual"`); samakan struktur dengan `kiluan_f2/fabrik.seed`.
  - Uji `upgrade head` → `downgrade` ke `0002_f1` bersih (urutan drop/FK benar).
- **`repo/sql.py`** +`RepoPengaturanDesa/SlotJadwal/Pesanan/PesananItem/Booking/Pembayaran` — **signature 1:1** dengan repo memori scaffold. **Hold kuota:** `SELECT … FOR UPDATE` pada `slot_jadwal` saat checkout (ganti `asyncio.Lock` scaffold; ini titik krusial anti-overbook — uji constraint di DB, bukan hanya Python).
- **Idempotensi (`app/inti/idempotensi.py`):** middleware/dependency membaca header `Idempotency-Key`, simpan `(key, pengguna_id, endpoint) → response` di **Redis** (TTL 24 jam). Wajib pada `POST /checkout` & `POST …/pembayaran`; hilang → `422 idempotency_key_wajib`.
- **Adapter pembayaran ber-gate (`app/inti/pembayaran/`):** antarmuka `PenyediaBayar` dengan impl `manual` (QRIS statis + bukti + konfirmasi bendahara). Slot `xendit`/`midtrans` **di-stub** (belum diintegrasi — keputusan #3).
- **Wujudkan** `layanan_dermaga.py` ke endpoint (KONTRAK §2–3): slot (`GET/POST/batch/PATCH/DELETE`), `POST /checkout`, `GET /pesanan(?milik)`, `GET /pesanan/{id|kode}`, `POST /pesanan/{id}/batal`, `PATCH …/item/{id}/fulfillment`, pembayaran (`GET/POST`, `bukti`, `konfirmasi-manual`), booking (`GET`, `checkin`, `selesai`). Job **pelepas hold** (`sapu_kedaluwarsa`) via scheduler.
- **Aturan faithful ke scaffold:** total `= subtotal − diskon + ongkir`; snapshot harga saat checkout; kalah race → `409 slot_penuh`; stok kurang → `409 stok_habis`; check-in butuh peran verifikator + booking `terkonfirmasi`; **pembeli tak boleh `konfirmasi-manual` pesanannya sendiri (403)**; hold kedaluwarsa/batal melepas kuota.
- **Tes:** port `test_checkout` hijau; **integrasi Postgres**: dua checkout paralel slot sisa 1 → satu sukses satu `409`, `kuota_terpakai` tak pernah > `kuota` (uji `FOR UPDATE` nyata); idempotensi checkout via Redis; isolasi `desa_id`.

### F9 (frontend)
Langkah 0, lalu:
- **Keranjang transient** (client/Redis per-pengguna, **bukan** tabel) → **halaman checkout** (`/[desa]/checkout`): ringkas item multi-penyedia, pilih slot tanggal (kalender ketersediaan dari `GET /slot`), kupon (pratinjau via `/kupon/{kode}/cek`), kontak, metode ambil/kirim. Kirim `Idempotency-Key` (UUID disimpan sampai sukses).
- **Instruksi bayar manual:** tampilkan **QRIS statis** + kode pesanan + uploader **bukti transfer** (presigned MinIO F0).
- **Lacak pesanan** (`/[desa]/pesanan/[id]`): status (menunggu→dibayar→diproses→selesai), hitung mundur `kedaluwarsa_pada`, **tiket QR** (`kode_checkin`) per booking.
- **Panel penyedia:** pesanan masuk untuk item miliknya, update `status_fulfillment` barang.
- **Scanner check-in** (petugas/agen): kamera pindai `kode_checkin` → `POST /booking/{id}/checkin`.
- **Offline-first:** entri slot & scan check-in lapangan → antrean sinkron tertunda (IndexedDB); checkout **online-only** (uang tak boleh dibuat offline).
- **Gerbang:** dua pembeli tak bisa merebut slot terakhir yang sama (UI+backend sepakat); klien yang kembali dari (nanti) redirect **tak** menandai lunas; QR check-in memindahkan booking ke `checkin`.

**Batas:** disbursement/refund otomatis & webhook gateway → B10. Diskon kampanye ke split → keputusan #1.

---

## Pasangan B10/F10 — Escrow ledger + Payout + Refund + Rekening + Webhook

**Tujuan.** Lapisan settlement: saat pembayaran `berhasil` → **split escrow** append-only per penyedia; rilis saat pesanan `selesai`; payout batch; refund berkebijakan. **Pembeda struktural non-OTA** (`porsi_reinvestasi` otomatis & teraudit) hidup di sini. PkM = **jalur manual**; webhook/disbursement disiapkan, dinyalakan Tahun 4–5.

### B10 (backend)
Langkah 0, lalu:
- **`repo/sql.py`** +`RepoTransaksi/Payout/RekeningPenyedia/Refund/WebhookPembayaran` (append-only untuk `transaksi`; **tak ada UPDATE** pada baris ledger — refund = baris negatif baru).
- **Wujudkan** `layanan_uang.py` + bagian settle `layanan_dermaga._settle` ke endpoint (KONTRAK §2, §4): `GET /transaksi`, rekening (`GET/POST/PATCH/verifikasi/DELETE`), payout (`GET/POST/transisi`), refund (`POST/GET/transisi`), `PATCH /pengaturan`, dan **global** `POST /webhooks/pembayaran/{gateway}`.
- **Settle (faithful scaffold):** per penyedia `porsi_reinvestasi = bruto × persen_reinvestasi`, `fee_platform = bruto × persen_fee_platform`, `neto_penyedia = bruto − fee − reinvestasi` (invarian dijaga service **dan** CHECK DB B9). Idempoten via `Idempotency-Key`/`webhook.event_id`.
- **Webhook:** **di luar path tenant**; verifikasi **signature** gateway (`401 webhook_signature_invalid`), resolve tenant `ref_eksternal → pembayaran → desa_id`, idempotensi `event_id` UNIQUE (kirim ulang → no-op, **tak menggandakan** `transaksi`), selalu `200` ke gateway. Payload mentah **tak** pernah keluar API.
- **Payout:** batch `transaksi` `dirilis` + `payout_id IS NULL` per penyedia → satu `payout` (`manual` tahap 1). Cegah **dobel payout**. Rekening wajib `terverifikasi`.
- **Refund:** state machine `diajukan→disetujui→diproses→selesai`; `proses` menulis `transaksi(refund)` negatif; **kebijakan default:** refund setelah pesanan `selesai` → `422 kebijakan_refund` (jalur manual bendahara).
- **Tes:** port `test_pembayaran_escrow` + `test_payout_refund` hijau; integrasi: bayar hanya `berhasil` via webhook/konfirmasi-manual; webhook ganda → satu transaksi; **invarian split** (uji CHECK DB menolak baris tak seimbang); rilis→payout anti-dobel; refund sebelum/sesudah selesai.

### F10 (frontend)
Langkah 0, lalu:
- **Bendahara — konfirmasi pembayaran manual:** antrean `pembayaran` menunggu + preview bukti transfer → tombol **Konfirmasi** (`konfirmasi-manual`). **Tanpa** opsi konfirmasi untuk pesanan sendiri.
- **Bendahara — payout:** daftar `transaksi dirilis` per penyedia, pilih rekening terverifikasi, buat `payout` (catat transfer manual), tandai berhasil/gagal.
- **Penyedia — rekening & pendapatan:** kelola `rekening_penyedia` (nomor dimask), lihat `transaksi` miliknya (bruto/fee/**reinvestasi**/neto) + status payout.
- **Refund:** pembeli ajukan; pengelola proses (setuju/tolak/proses/selesai).
- **Transparansi reinvestasi (pembeda non-OTA):** tampilkan porsi reinvestasi tiap transaksi di struk & ringkasan penyedia — **terlihat**, bukan tersembunyi.
- **Gerbang:** hanya bendahara mengonfirmasi/payout; pembeli tak konfirmasi sendiri; struk menampilkan reinvestasi; penyedia hanya melihat transaksinya.

**Batas:** integrasi SDK gateway nyata → ADR gateway (keputusan #3), Tahun 4–5. Alokasi diskon kampanye → keputusan #1.

---

## Pasangan B11/F11 — Kupon & Tukar Poin

**Tujuan.** Menutup flywheel Misi Kiluan: poin (dari Lencana B5) ditukar hadiah/kupon; kupon "UMKM bersertifikat" mengarahkan diskon. Reuse `transaksi_poin` (append-only, idempoten) — **tak ada ledger poin baru**.

### B11 (backend)
Langkah 0, lalu:
- **`repo/sql.py`** +`RepoKatalogHadiah/PenukaranPoin/Kupon/PemakaianKupon`. Redeem menulis `transaksi_poin` **negatif** (`kode_aksi="tukar_hadiah"`, `referensi=(penukaran_poin,id)`) via `ON CONFLICT DO NOTHING` (idempoten, cegah double-spend). Saldo = `SUM(transaksi_poin.poin)` per `(pengguna, desa)` dengan **lock**.
- **Wujudkan** `layanan_poin.py` (kupon+tukar) ke endpoint (KONTRAK §5): `GET /hadiah(/{id})`, `POST /hadiah` (kelola), `POST /tukar` [Idempotency-Key], `GET /penukaran/saya`, `GET /kupon/saya`, `GET /kupon/{kode}/cek`, `POST /kupon`. Penerapan kupon **di dalam** checkout B9 (`pemakaian_kupon` UNIQUE + increment `terpakai` atomik).
- **Aturan faithful:** saldo kurang → `422 saldo_poin_kurang`; syarat `tingkat_min` (dari `sertifikasi_owner` B8) tak terpenuhi → `422`; stok habis → `409`; kupon kedaluwarsa/limit/min/penyedia luar cakupan → `422 kupon_tidak_berlaku`; `UNIQUE(kupon,pesanan)` cegah pakai ganda.
- **Tes:** port `test_poin_kupon` hijau; integrasi: redeem dua kali (key/`ON CONFLICT`) → satu baris; kupon `penyedia_terbatas` hanya untuk penyedia bersangkutan.

### F11 (frontend)
Langkah 0, lalu:
- **Katalog hadiah** `/[desa]/tukar-poin`: saldo poin, kartu hadiah (biaya, stok, `syarat` tingkat), tombol Tukar (`Idempotency-Key`).
- **Dompet kupon** `/[desa]/kupon`: kupon milik + publik berlaku; badge "diskon UMKM bersertifikat".
- **Integrasi checkout (F9):** input kode kupon + pratinjau diskon sebelum bayar.
- **Kelola hadiah/kupon kampanye** (pengelola).
- **Gerbang:** tukar mengurangi saldo tepat sekali; kupon tingkat hanya muncul untuk owner memenuhi syarat; diskon konsisten pratinjau↔checkout.

**Batas:** alokasi pendanaan diskon kampanye ke split → keputusan #1 (kunci sebelum menyalakan kupon kampanye).

---

## Pasangan B12/F12 — Penjelajah Lestari + Verifikasi (Misi Kiluan wisatawan)

**Tujuan.** Sisi wisatawan Misi Kiluan: misi belajar→aksi, Stasiun Lestari (QR+geofence), Paspor Lestari, Stempel terverifikasi. **Pintu anti-greenwashing:** hanya stempel terverifikasi masuk paspor (dan F3 neraca). Bagian thin-slice PkM.

### B12 (backend)
Langkah 0, lalu:
- **`repo/sql.py`** +`RepoMisi/StasiunLestari/PasporLestari/Stempel/Verifikasi`. Geofence pakai **PostGIS `ST_DWithin(lokasi, stasiun.lokasi, radius_m)`** (ganti haversine scaffold).
- **Wujudkan** `layanan_penjelajah.py` (KONTRAK §6): misi (`GET(/{id})`, `POST/PATCH` kelola), `POST /misi/{id}/selesai`, stasiun (`GET/POST/PATCH/DELETE`, `qr_token` disembunyikan dari publik + dirotasi), `GET /paspor/saya`, `GET /stempel/saya`, `GET /verifikasi`, `POST /verifikasi/{id}/putuskan`.
- **Aturan faithful:** verifikasi **sinkron** untuk `qr_checkin`/`otomatis` (cek `qr_token` + geofence); `konfirmasi_pemandu` `menunggu` sampai `putuskan` oleh verifikator berperan; bukti foto wajib bila `syarat.bukti.foto` (`422 bukti_kurang`); di luar geofence → `422 di_luar_geofence`; **hanya `terverifikasi`** menaikkan `paspor.ringkasan_dampak` + `total_stempel`. `verifikasi` generik juga menaungi `entitas_tipe=pengajuan_kartu` (F1) — jalur bukti mulai bisa dipakai (endpoint F1 tak berubah).
- **Tes:** port `test_penjelajah` hijau; integrasi: geofence `ST_DWithin` nyata; klaim tanpa bukti tak masuk paspor; isolasi `desa_id`.

### F12 (frontend)
Langkah 0, lalu:
- **Peta misi** `/[desa]/misi`: quest per kategori (mangrove/karang/sampah/lumba/budaya); misi `belajar` buka **micro-lesson** (kode etik lumba/karang) → membuka `aksi`.
- **Selesaikan misi:** pindai QR **Stasiun Lestari** (`qr_token`) + tangkap lokasi (geofence) + foto bukti bila diminta; tautkan ke booking bila saat kunjungan.
- **Paspor Lestari** `/[desa]/paspor`: stempel terverifikasi + `ringkasan_dampak` ("kamu bantu tanam 5 mangrove") + progres.
- **Verifikator/pemandu:** antrean `konfirmasi_pemandu` → putuskan valid/invalid.
- **Offline-first:** scan+foto+lokasi lapangan tersimpan lokal, sinkron tertunda; verifikasi final tetap server-side.
- **Gerbang:** stempel di luar geofence ditolak; belajar wajib sebelum aksi; hanya terverifikasi tampil di paspor.

**Batas:** validasi silang `stempel.dampak` ↔ `monitoring_ekologi` (survival mangrove nyata) → **F3**. Di F2 verifikasi = QR/geofence + konfirmasi manusia; klaim dampak **belum** tervalidasi ekologis (hindari greenwashing: label "aksi tercatat", bukan "dampak terbukti", sampai F3).

---

## Pasangan B13/F13 — Pemandu (AI tourism assistant, rule-based)

**Tujuan.** Asisten itinerary/estimasi/tanya-jawab **rule-based** atas data lokal, menghormati kuota slot. LLM **di-gate** (bisa dimatikan — kendali biaya & kedaulatan data); **tak diaktifkan PkM**.

### B13 (backend)
Langkah 0, lalu:
- **`repo/sql.py`** +`RepoSesiPemandu/PercakapanPemandu` (ringan; boleh stateless bila thin slice hanya butuh itinerary/estimasi).
- **Adapter LLM ber-gate (`app/inti/pemandu/`):** antarmuka `MesinPemandu` dengan impl `rule` (default) + slot `llm` **mati by default** (flag env). Jangan panggil LLM di PkM.
- **Wujudkan** `layanan_pemandu.py` (KONTRAK §7): `POST /pemandu/itinerary`, `/estimasi`, `/chat`, `GET /pemandu/sesi/{id}` (hanya pemilik). Itinerary **menghormati kuota** (`slot_jadwal` `buka` & `sisa>0` — tak menyarankan slot penuh).
- **Tes:** port `test_pemandu_tenant` (bagian pemandu) hijau; integrasi: itinerary tak memuat slot penuh; sesi orang lain → 404; sesi anonim diizinkan.

### F13 (frontend)
Langkah 0, lalu:
- **Perencana** `/[desa]/pemandu`: form constraint (durasi/minat/budget/tanggal/jumlah orang) → itinerary + estimasi biaya; tombol "tambah ke keranjang" (sambung checkout F9).
- **Chat ringan** (opsional): tanya-jawab atas konten destinasi (tampilkan `sumber`/RAG refs).
- **Gerbang:** itinerary tak menawarkan slot penuh; anonim boleh mencoba; label jelas "saran otomatis".

**Batas:** LLM penuh + riwayat chat penuh → Tahun 4–5 (di belakang gate biaya/kedaulatan data).

---

## Penutup F2 & langkah selanjutnya

```
B9/F9 ──► B10/F10 ──► B11/F11
   (Dermaga inti) (Escrow/payout) (Kupon/Poin)
        └────────► B12/F12 (Penjelajah)   └────────► B13/F13 (Pemandu)
```

1. **Eksekusi B9→B13 berurutan** di Cursor; tiap pasangan hijaukan gerbang (subset KONTRAK §11) sebelum lanjut. Simpan keputusan sebagai **ADR** pendek di `docs/adr/`: migrasi front-loaded `0003_f2`, idempotensi header+Redis, webhook di luar tenant, invarian split via CHECK, manual-first payment, kebijakan refund konservatif, alokasi diskon (keputusan #1).
2. **Thin-slice PkM = B9 + B10(manual) + B12.** Cukupkan itu untuk demo lapangan; B11/B13 & otomasi gateway menyusul. Jangan menyalakan transaksi produksi sebelum **FGD `persen_reinvestasi`** (keputusan #2) disahkan.
3. **Tutup F2:** seluruh gerbang `pytest` §11 hijau (unit memori + integrasi Postgres/PostGIS); uji end-to-end satu pesanan nyata: checkout→bayar manual→konfirmasi→booking check-in→selesai→(rilis)→payout manual, dan satu misi QR→stempel terverifikasi→paspor.
4. **Menuju F3 (Analitik & Regeneratif):** `transaksi.porsi_reinvestasi`→`dana_konservasi`; `booking`+check-in→`pemakaian_kapasitas` (opsional blokir booking saat spot merah); `neto_penyedia`→`neraca_regeneratif`; `monitoring_ekologi` + perluasan `verifikasi.entitas_tipe`; validasi silang `stempel.dampak` ↔ survival monitoring (baru di sini klaim dampak jadi "terbukti"). Outbox `peristiwa` (`transaksi_settle`, `booking_selesai`, `stempel_terverifikasi`) disiapkan dari event F2.

> Catatan: seluruh endpoint F2 sudah ber-slug/tenant & ber-`desa_id` → RLS per-desa (F4) = tambah kebijakan DB, bukan refactor. `pengaturan_desa` diperluas `bahasa`/`zona_waktu`/`status_go_live` di F4; webhook per-desa (bila tiap desa punya akun gateway terpisah) juga F4.

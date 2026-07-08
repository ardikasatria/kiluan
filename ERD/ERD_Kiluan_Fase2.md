# ERD Fase 2 — Kiluan (Revisi: commerce escrow)

**Cakupan:** **Dermaga** (Pemesanan & Transaksi: pesanan generik, jadwal & booking, **pembayaran escrow via gateway Indonesia**, ledger transaksi, payout, refund, kupon & tukar-poin) · **Pemandu** (AI Tourism Assistant rule-based) · **Penjelajah Lestari** (Misi Kiluan sisi wisatawan: misi, Paspor, Stempel, Stasiun) + tabel generik **`verifikasi`** (lahir di F2).
**Bergantung pada F0–F1:** `desa`, `pengguna`, `keanggotaan`, `destinasi`, `layanan`, `produk_jasa`, `paket_wisata`, `paket_item`, `umkm`, `media`, `transaksi_poin`, `badge`, `pengajuan_kartu`, `sertifikasi_owner`.
**Menyiapkan F3:** `transaksi.porsi_reinvestasi` → inflow `dana_konservasi`; `transaksi.neto_penyedia` → distribusi pendapatan Neraca; `booking` → `pemakaian_kapasitas`; `stempel`+`verifikasi` → validasi silang anti-greenwashing.
**Prinsip tetap:** multi-tenant per-`desa_id`, ledger uang **append-only**, enum di aplikasi + CHECK, idempotensi wajib pada uang & poin.

> **Revisi vs draft blueprint.** Blueprint menyinggung `booking` + `transaksi` sederhana (asumsi bayar manual). Keputusan **escrow via gateway Indonesia (ADR-02, §8)** menaikkan cakupan pembayaran: `pesanan` menggeneralisasi barang+jasa, `transaksi` jadi ledger per-penyedia dengan split, ditambah `pembayaran`, `webhook_pembayaran`, `payout`, `rekening_penyedia`, `refund`, serta lapisan kupon/tukar-poin. **Rancang penuh sekarang, aktifkan bertahap** (tahap 1 PkM = jalur manual + QRIS statis; disbursement/refund otomatis menyusul) — pola yang sama dengan "tenant sejak F0".

---

## 1a. Diagram — Dermaga (commerce + escrow)

```mermaid
erDiagram
    DESA          ||--o| PENGATURAN_DESA   : ""
    DESA          ||--o{ PESANAN           : ""
    PENGGUNA      ||--o{ PESANAN           : "pembeli"
    PESANAN       ||--o{ PESANAN_ITEM      : ""
    PESANAN_ITEM  ||--o| BOOKING           : "item berjadwal"
    SLOT_JADWAL   ||--o{ BOOKING           : ""
    DESTINASI     ||--o{ BOOKING           : "null,kapasitas"
    PESANAN       ||--o{ PEMBAYARAN        : "retry→banyak"
    MEDIA         ||--o| PEMBAYARAN        : "bukti manual"
    PEMBAYARAN    ||--o{ WEBHOOK_PEMBAYARAN : "ref_eksternal"
    PESANAN       ||--o{ TRANSAKSI         : "per penyedia"
    PEMBAYARAN    ||--o{ TRANSAKSI         : ""
    TRANSAKSI     }o--o| PAYOUT            : "settle→cair"
    REKENING_PENYEDIA ||--o{ PAYOUT        : ""
    PESANAN       ||--o{ REFUND            : ""

    PENGATURAN_DESA {
      uuid desa_id PK
      numeric persen_reinvestasi "0-1"
      numeric persen_fee_platform "0-1"
      jsonb kebijakan_pembatalan
      smallint batas_hold_menit
      varchar gateway "midtrans|xendit|manual"
      jsonb konfig_gateway "sub-account/split"
      timestamptz diperbarui_pada
    }

    PESANAN {
      uuid id PK
      uuid desa_id FK
      uuid pembeli_id FK
      varchar kode_pesanan UK
      varchar status "enum,state-machine"
      varchar metode_ambil "ambil_ditempat|kirim"
      jsonb alamat_kirim "null"
      jsonb kontak
      uuid kupon_id FK "null"
      numeric subtotal
      numeric diskon
      numeric ongkir
      numeric total
      timestamptz kedaluwarsa_pada
      timestamptz dibuat_pada
      timestamptz diperbarui_pada
    }

    PESANAN_ITEM {
      uuid id PK
      uuid desa_id FK
      uuid pesanan_id FK
      varchar item_tipe "enum,polimorfik"
      uuid item_id
      varchar penyedia_tipe "umkm|pengguna"
      uuid penyedia_id
      varchar nama_snapshot
      numeric harga_snapshot
      integer jumlah
      varchar satuan
      numeric subtotal
      uuid slot_jadwal_id FK "null"
      varchar status_fulfillment "enum"
      jsonb metadata "tgl/jumlah_orang"
    }

    SLOT_JADWAL {
      uuid id PK
      uuid desa_id FK
      varchar subjek_tipe "paket_wisata|layanan"
      uuid subjek_id
      date tanggal
      time waktu_mulai "null"
      time waktu_selesai "null"
      integer kuota
      integer kuota_terpakai
      numeric harga_override "null"
      varchar status "buka|tutup|penuh"
    }

    BOOKING {
      uuid id PK
      uuid desa_id FK
      uuid pesanan_item_id FK "UK"
      uuid slot_jadwal_id FK
      uuid destinasi_id FK "null"
      integer jumlah_orang
      date tanggal_kunjungan
      varchar kode_checkin UK
      varchar status "enum,state-machine"
      timestamptz checkin_pada "null"
      timestamptz dibuat_pada
    }

    PEMBAYARAN {
      uuid id PK
      uuid desa_id FK
      uuid pesanan_id FK
      varchar metode "enum"
      varchar penyedia_gateway "enum"
      numeric jumlah
      varchar status "enum,state-machine"
      varchar ref_eksternal UK "null"
      varchar redirect_url "null"
      uuid bukti_media_id FK "null"
      timestamptz kedaluwarsa_pada
      timestamptz dibayar_pada "null"
      jsonb mentah
      timestamptz dibuat_pada
    }

    WEBHOOK_PEMBAYARAN {
      uuid id PK
      varchar penyedia_gateway
      varchar event_id UK "idempotensi"
      varchar ref_eksternal
      varchar jenis_event
      jsonb muatan
      varchar status_proses "enum"
      timestamptz diterima_pada
      timestamptz diproses_pada "null"
    }

    TRANSAKSI {
      uuid id PK
      uuid desa_id FK
      uuid pesanan_id FK
      uuid pembayaran_id FK
      varchar penyedia_tipe
      uuid penyedia_id
      varchar jenis "penjualan|refund|penyesuaian"
      numeric bruto
      numeric fee_platform
      numeric porsi_reinvestasi
      numeric neto_penyedia
      varchar status "enum,escrow"
      uuid payout_id FK "null"
      timestamptz dibuat_pada
    }

    PAYOUT {
      uuid id PK
      uuid desa_id FK
      varchar penyedia_tipe
      uuid penyedia_id
      uuid rekening_id FK
      numeric jumlah
      varchar metode "disbursement|manual"
      varchar status "enum"
      varchar ref_eksternal "null"
      text catatan
      timestamptz dibuat_pada
      timestamptz diproses_pada "null"
    }

    REKENING_PENYEDIA {
      uuid id PK
      uuid desa_id FK
      varchar penyedia_tipe
      uuid penyedia_id
      varchar jenis "bank|ewallet"
      varchar bank_kode "null"
      varchar nomor
      varchar nama_pemilik
      boolean terverifikasi
      boolean utama
      timestamptz dibuat_pada
    }

    REFUND {
      uuid id PK
      uuid desa_id FK
      uuid pesanan_id FK
      uuid pesanan_item_id FK "null,parsial"
      uuid pemohon_id FK
      text alasan
      numeric jumlah
      varchar status "enum,state-machine"
      varchar ref_eksternal "null"
      uuid disetujui_oleh FK "null"
      timestamptz dibuat_pada
      timestamptz selesai_pada "null"
    }
```

## 1b. Diagram — Kupon & Tukar Poin

```mermaid
erDiagram
    DESA           ||--o{ KATALOG_HADIAH   : "null=global"
    DESA           ||--o{ KUPON            : ""
    PENGGUNA       ||--o{ PENUKARAN_POIN   : ""
    KATALOG_HADIAH ||--o{ PENUKARAN_POIN   : ""
    PENUKARAN_POIN ||--o| KUPON            : "menghasilkan"
    KUPON          ||--o{ PEMAKAIAN_KUPON  : ""
    PESANAN        ||--o{ PEMAKAIAN_KUPON  : ""
    PENGGUNA       ||--o{ KUPON            : "pemilik,null"

    KATALOG_HADIAH {
      uuid id PK
      uuid desa_id FK "null=global"
      varchar kode UK
      varchar nama
      text deskripsi
      varchar jenis "kupon_diskon|merchandise|tiket|donasi"
      integer biaya_poin
      integer stok "null"
      jsonb syarat "mis. tingkat_min"
      uuid media_id FK "null"
      boolean aktif
      date berlaku_mulai "null"
      date berlaku_sampai "null"
    }

    PENUKARAN_POIN {
      uuid id PK
      uuid desa_id FK
      uuid pengguna_id FK
      uuid hadiah_id FK
      integer poin_dipakai
      uuid kupon_id FK "null"
      varchar status "berhasil|dibatalkan"
      timestamptz dibuat_pada
    }

    KUPON {
      uuid id PK
      uuid desa_id FK
      varchar kode UK
      uuid pemilik_id FK "null=publik"
      varchar sumber "tukar_poin|promo_owner|kampanye"
      varchar tipe_diskon "persen|nominal"
      numeric nilai
      numeric min_belanja "null"
      integer batas_pakai
      integer terpakai
      jsonb penyedia_terbatas "null"
      timestamptz berlaku_mulai "null"
      timestamptz berlaku_sampai "null"
      varchar status "aktif|nonaktif|habis|kedaluwarsa"
      timestamptz dibuat_pada
    }

    PEMAKAIAN_KUPON {
      uuid id PK
      uuid kupon_id FK
      uuid pesanan_id FK
      uuid pengguna_id FK
      numeric jumlah_diskon
      timestamptz dibuat_pada
    }
```

## 1c. Diagram — Penjelajah Lestari (Misi Kiluan wisatawan) + Verifikasi

```mermaid
erDiagram
    DESA            ||--o{ MISI            : "null=template"
    DESA            ||--o{ STASIUN_LESTARI : ""
    DESTINASI       ||--o| STASIUN_LESTARI : "null"
    STASIUN_LESTARI ||--o{ MISI            : "null"
    BADGE           ||--o| MISI            : "null,reward"
    DESA            ||--o{ PASPOR_LESTARI  : ""
    PENGGUNA        ||--o| PASPOR_LESTARI  : ""
    PASPOR_LESTARI  ||--o{ STEMPEL         : ""
    MISI            ||--o{ STEMPEL         : ""
    BOOKING         ||--o| STEMPEL         : "null,saat kunjungan"
    STASIUN_LESTARI ||--o{ STEMPEL         : "null"
    MEDIA           ||--o| STEMPEL         : "null,foto bukti"
    STEMPEL         ||--o{ VERIFIKASI      : "polimorfik"

    MISI {
      uuid id PK
      uuid desa_id FK "null=template"
      varchar kode UK
      varchar judul
      text deskripsi
      varchar jenis "belajar|aksi"
      varchar kategori "mangrove|karang|sampah|lumba|budaya"
      jsonb micro_lesson "null,utk belajar"
      jsonb syarat_verifikasi "metode/geofence/bukti"
      uuid stasiun_id FK "null"
      integer poin
      smallint badge_id FK "null"
      jsonb dampak_template "mis {mangrove:1}"
      boolean aktif
      timestamptz dibuat_pada
    }

    STASIUN_LESTARI {
      uuid id PK
      uuid desa_id FK
      varchar nama
      varchar tipe "dermaga|titik_mangrove|pos"
      uuid destinasi_id FK "null"
      geography lokasi "point"
      varchar qr_token UK
      integer radius_m "geofence"
      boolean aktif
      timestamptz dibuat_pada
    }

    PASPOR_LESTARI {
      uuid id PK
      uuid desa_id FK
      uuid pengguna_id FK
      jsonb ringkasan_dampak "akumulasi terverifikasi"
      integer total_stempel
      timestamptz dibuat_pada
      timestamptz diperbarui_pada
    }

    STEMPEL {
      uuid id PK
      uuid desa_id FK
      uuid paspor_id FK
      uuid misi_id FK
      uuid booking_id FK "null"
      uuid stasiun_id FK "null"
      jsonb dampak "mis {mangrove:5}"
      varchar status "enum,state-machine"
      geography lokasi "null,geotag"
      uuid media_id FK "null"
      timestamptz dibuat_pada
    }

    VERIFIKASI {
      uuid id PK
      uuid desa_id FK
      varchar entitas_tipe "enum,polimorfik"
      uuid entitas_id
      varchar metode "enum"
      uuid verifikator_id FK "null"
      jsonb syarat "geofence/bukti"
      varchar hasil "valid|invalid|menunggu"
      jsonb bukti "null"
      geography lokasi "null"
      timestamptz dibuat_pada
      timestamptz diputuskan_pada "null"
    }
```

## 1d. Diagram — Pemandu (AI, ringan)

```mermaid
erDiagram
    DESA        ||--o{ SESI_PEMANDU        : ""
    PENGGUNA    ||--o{ SESI_PEMANDU        : "null=anon"
    SESI_PEMANDU ||--o{ PERCAKAPAN_PEMANDU : ""

    SESI_PEMANDU {
      uuid id PK
      uuid desa_id FK
      uuid pengguna_id FK "null"
      varchar tipe "itinerary|estimasi|chat"
      jsonb masukan "constraint"
      jsonb keluaran "null"
      varchar model_dipakai "rule|llm"
      timestamptz dibuat_pada
    }

    PERCAKAPAN_PEMANDU {
      uuid id PK
      uuid sesi_id FK
      varchar peran "pengguna|asisten"
      text isi
      jsonb sumber "null,RAG refs"
      timestamptz dibuat_pada
    }
```

---

## 2. Perubahan lintas-fase

- **Baru: `pengaturan_desa`** (1-1 `desa`) lahir di F2 — persen reinvestasi, fee platform, kebijakan pembatalan, `gateway`/`konfig_gateway`. F4 memperluas dengan `bahasa`/`zona_waktu`/`status_go_live`.
- `paket_wisata.kuota_default` (F1) → dimaterialisasi per tanggal lewat **`slot_jadwal`**; `layanan` berjadwal (mis. perahu lumba-lumba) juga memakai slot.
- `produk_jasa.stok` (F1) dipotong saat `pesanan` **dibayar** (bukan saat masuk keranjang); barang tak berjadwal → tanpa `booking`.
- `transaksi_poin` (F1, append-only) menampung **redeem** lewat baris **poin negatif** (`kode_aksi='tukar_hadiah'`, `referensi_tipe='penukaran_poin'`) — memakai `UNIQUE(pengguna, kode_aksi, referensi_tipe, referensi_id)` yang sudah ada untuk idempotensi. **Tak perlu ledger poin baru.**
- **`verifikasi`** lahir di F2 (`entitas_tipe`: `stempel`, `pengajuan_kartu`). F3 memperluasnya ke `monitoring_ekologi`. Ini titik di mana validasi `pengajuan_kartu` (F1, manual) mulai bisa berbasis bukti.
- **Keranjang (cart) transient** di client/Redis — bukan tabel. `pesanan` dibuat saat checkout. Tradeoff: keranjang tak lintas-perangkat kecuali disinkron via Redis per-pengguna; cukup untuk F2.

---

## 3. Spesifikasi tabel

### Dermaga — commerce

**`pengaturan_desa`** — sumber kebenaran parameter uang per desa. `persen_reinvestasi` menentukan `transaksi.porsi_reinvestasi`; `batas_hold_menit` mengatur `pesanan.kedaluwarsa_pada` (lepas kuota bila tak dibayar). `konfig_gateway` menyimpan id sub-account/split rule (§8). **Blocker non-teknis:** `persen_reinvestasi` & tata kelola dana escrow **wajib disepakati FGD dengan Pokdarwis/perangkat desa sebelum go-live** (guardrail reinvestment loop).

**`pesanan`** (order header) — satu checkout, boleh multi-item & **multi-penyedia**. `kode_pesanan` human-readable unik. `total = subtotal − diskon + ongkir`. `metode_ambil` membedakan oleh-oleh `ambil_ditempat` vs `kirim` (`alamat_kirim` jsonb). State machine §5. Indeks `(desa_id, status, dibuat_pada)`, `(pembeli_id)`.

**`pesanan_item`** — baris polimorfik. `item_tipe`: `produk_jasa | paket_wisata | layanan | tiket_masuk`. **Snapshot** `nama_snapshot`/`harga_snapshot` membekukan harga saat checkout (histori tak berubah bila katalog berubah). `penyedia_tipe/penyedia_id` menentukan penerima payout. `status_fulfillment`: `menunggu | disiapkan | dikirim | diterima | diambil | batal` (relevan barang fisik; jasa memakai `booking`). `slot_jadwal_id` diisi bila item berjadwal. Indeks `(pesanan_id)`, `(penyedia_tipe, penyedia_id)`.

**`slot_jadwal`** — kuota per tanggal untuk subjek berjadwal (`paket_wisata`/`layanan`). `kuota_terpakai` counter dijaga **row lock** saat checkout (§6, anti-overbook). `harga_override` opsional (mis. harga akhir pekan). `UNIQUE(subjek_tipe, subjek_id, tanggal, waktu_mulai)`. `status` `penuh` diset otomatis saat `kuota_terpakai = kuota`.

**`booking`** — reservasi berjadwal, **1-1 dengan `pesanan_item` berjadwal** (`UNIQUE(pesanan_item_id)`). Memegang `slot_jadwal_id`, `destinasi_id` (untuk daya dukung F3, nullable karena paket bisa multi-destinasi), `jumlah_orang`, `kode_checkin` (QR tiket). State machine §5. **Sumber `pemakaian_kapasitas` F3** = booking `terkonfirmasi`+`checkin` per `(destinasi_id, tanggal_kunjungan)`.

**`pembayaran`** — satu upaya bayar untuk satu pesanan; retry → banyak baris, maksimal satu `berhasil`. `metode`: `qris | va_bank | ewallet | kartu | transfer_manual`. `penyedia_gateway`: `midtrans | xendit | manual`. `ref_eksternal` = id transaksi gateway (unik per gateway). `bukti_media_id` untuk `transfer_manual` (foto bukti transfer). `mentah` menyimpan payload gateway untuk audit. **Escrow: dana masuk akun/sub-account escrow platform, bukan langsung penyedia.** State machine §5.

**`webhook_pembayaran`** — log callback gateway. `event_id` **UNIQUE** memberi idempotensi tepat-sekali (gateway kerap mengirim ulang). `status_proses`: `diterima | diproses | diabaikan | gagal`. Kanal kebenaran status bayar adalah webhook + verifikasi status (bukan redirect klien).

**`transaksi`** — **ledger settlement append-only, granular per penyedia** (satu pesanan multi-penyedia → banyak baris). Split: `bruto` (Σ item penyedia) → `fee_platform` (dari `persen_fee_platform`; rendah/0 — community-owned, **bukan** take-rate OTA) + `porsi_reinvestasi` (dari `persen_reinvestasi`, ke dana konservasi F3) + `neto_penyedia` (dipayout). `jenis`: `penjualan | refund | penyesuaian`; refund = **baris baru negatif**, tak pernah update. `status` escrow §5. `payout_id` diisi saat masuk pencairan. Indeks `(desa_id, dibuat_pada)`, `(penyedia_tipe, penyedia_id, status)`, `(pesanan_id)`.

**`payout`** — pencairan escrow → penyedia (batch: banyak `transaksi` `dirilis` → satu payout). `metode`: `disbursement` (API gateway, mis. Xendit Disbursement/Midtrans Iris) atau `manual` (transfer bendahara Pokdarwis, tahap 1 PkM). `ref_eksternal` = id disbursement. Indeks `(desa_id, status)`, `(penyedia_tipe, penyedia_id)`.

**`rekening_penyedia`** — tujuan payout (`bank`/`ewallet`). `utama` tunggal per penyedia; `terverifikasi` sebelum bisa dipayout. Data sensitif — akses terbatas & tak pernah keluar ke publik.

**`refund`** — permohonan & proses refund (penuh/parsial via `pesanan_item_id`). State machine §5. Menghasilkan `transaksi(jenis=refund)` + entri pembayaran refund gateway. **Kebijakan escrow:** refund penuh mudah **sebelum** `payout`; sesudah dirilis → clawback rumit, jadi default kebijakan = refund hanya sebelum status `selesai`/payout (sisanya jalur manual bendahara). Ini tradeoff sadar demi kesederhanaan tahap 1.

### Dermaga — kupon & tukar poin

**`katalog_hadiah`** — item yang bisa ditukar poin. `jenis`: `kupon_diskon | merchandise | tiket | donasi`. `biaya_poin` + `stok` (null=tak terbatas, mis. kupon). `syarat` jsonb (mis. `{"tingkat_min":"bahari"}`). `desa_id` null = hadiah global.

**`penukaran_poin`** — event redeem. Guard: **saldo poin** (`SUM(transaksi_poin.poin)` per `(pengguna, desa)`) `>= biaya_poin` dengan lock → cegah saldo minus/double-spend. Menulis `transaksi_poin` negatif + (bila `kupon_diskon`) menerbitkan `kupon`. Indeks `(desa_id, pengguna_id)`.

**`kupon`** — voucher diskon. `sumber`: `tukar_poin | promo_owner | kampanye`. `pemilik_id` null = kupon publik. `penyedia_terbatas` jsonb membatasi ke penyedia tertentu — inilah kanal **"diskon dari UMKM bersertifikat"** (mis. `{"tingkat":"lumba_lumba"}` atau daftar `umkm_id`), menutup flywheel Misi Kiluan. `tipe_diskon` `persen|nominal`, `min_belanja`, `batas_pakai`/`terpakai`. `kode` UNIQUE.

**`pemakaian_kupon`** — log & idempotensi. `UNIQUE(kupon_id, pesanan_id)` cegah pakai ganda pada satu pesanan; increment `kupon.terpakai` atomik.

### Penjelajah Lestari + Verifikasi

**`misi`** — quest. `jenis`: `belajar` (buka `micro_lesson` wajib — edukasi kode etik lumba/karang/sampah) → membuka `aksi`. `syarat_verifikasi` jsonb (metode, geofence, bukti). `stasiun_id` titik aksi. `dampak_template` menormalkan dampak per penyelesaian. `desa_id` null = template. Reward: `poin` + `badge_id` (F1) + kupon (via katalog).

**`stasiun_lestari`** — titik QR fisik. `qr_token` UNIQUE (dirotasi berkala), `radius_m` geofence untuk validasi lokasi. `lokasi` PostGIS point.

**`paspor_lestari`** — impact passport, `UNIQUE(desa_id, pengguna_id)`. `ringkasan_dampak` = akumulasi **hanya stempel terverifikasi** ("kamu bantu tanam 5 mangrove, kurangi 2 kg sampah").

**`stempel`** — bukti penyelesaian misi. `dampak` jsonb aktual (mis. `{mangrove:5}`). `status` state machine §5, divalidasi lewat `verifikasi`. `booking_id` menautkan aksi ke kunjungan; `stasiun_id`+`lokasi` geotag untuk geofence. **Hanya `terverifikasi` yang masuk `paspor` & (F3) `neraca_regeneratif`.**

**`verifikasi`** (generik, polimorfik) — `entitas_tipe`: `stempel | pengajuan_kartu` (F3 + `monitoring_ekologi`). `metode`: `qr_checkin | foto_geotag | konfirmasi_pemandu | otomatis`. `syarat` jsonb (geofence radius, bukti wajib). `hasil`: `menunggu | valid | invalid`. Menolak bukti di luar geofence / tanpa bukti sesuai `syarat`. Indeks `(entitas_tipe, entitas_id)`, `(desa_id, hasil)`.

### Pemandu (AI)

**`sesi_pemandu`** — satu interaksi. `tipe`: `itinerary | estimasi | chat`. `masukan` constraint (durasi/minat/budget/musim); `keluaran` hasil deterministik. `model_dipakai`: `rule` (thin slice PkM) atau `llm` (di-gate, bisa dimatikan — kendali biaya & kedaulatan data). **`percakapan_pemandu`** menyimpan riwayat chat + `sumber` (RAG refs) untuk konteks & evaluasi. Tabel ringan; boleh ditunda bila thin slice hanya butuh stateless.

---

## 4. Enum F2

| Kolom | Nilai |
|---|---|
| `pesanan.status` | menunggu_pembayaran, dibayar, diproses, selesai, dibatalkan, kedaluwarsa, refund |
| `pesanan.metode_ambil` | ambil_ditempat, kirim |
| `pesanan_item.item_tipe` | produk_jasa, paket_wisata, layanan, tiket_masuk |
| `pesanan_item.penyedia_tipe` | umkm, pengguna |
| `pesanan_item.status_fulfillment` | menunggu, disiapkan, dikirim, diterima, diambil, batal |
| `slot_jadwal.subjek_tipe` | paket_wisata, layanan |
| `slot_jadwal.status` | buka, tutup, penuh |
| `booking.status` | dipesan, terkonfirmasi, checkin, selesai, noshow, batal |
| `pembayaran.metode` | qris, va_bank, ewallet, kartu, transfer_manual |
| `pembayaran.penyedia_gateway` | midtrans, xendit, manual |
| `pembayaran.status` | menunggu, diproses, berhasil, gagal, kedaluwarsa, refund_sebagian, refund_penuh |
| `webhook_pembayaran.status_proses` | diterima, diproses, diabaikan, gagal |
| `transaksi.jenis` | penjualan, refund, penyesuaian |
| `transaksi.status` | tertahan_escrow, dirilis, direfund, sebagian_refund |
| `payout.metode` | disbursement, manual |
| `payout.status` | antri, diproses, berhasil, gagal |
| `rekening_penyedia.jenis` | bank, ewallet |
| `refund.status` | diajukan, disetujui, ditolak, diproses, selesai |
| `katalog_hadiah.jenis` | kupon_diskon, merchandise, tiket, donasi |
| `penukaran_poin.status` | berhasil, dibatalkan |
| `kupon.sumber` | tukar_poin, promo_owner, kampanye |
| `kupon.tipe_diskon` | persen, nominal |
| `kupon.status` | aktif, nonaktif, habis, kedaluwarsa |
| `misi.jenis` | belajar, aksi |
| `misi.kategori` | mangrove, karang, sampah, lumba, budaya |
| `stasiun_lestari.tipe` | dermaga, titik_mangrove, pos |
| `stempel.status` | menunggu_verifikasi, terverifikasi, ditolak |
| `verifikasi.entitas_tipe` | stempel, pengajuan_kartu |
| `verifikasi.metode` | qr_checkin, foto_geotag, konfirmasi_pemandu, otomatis |
| `verifikasi.hasil` | menunggu, valid, invalid |
| `sesi_pemandu.tipe` | itinerary, estimasi, chat |
| `sesi_pemandu.model_dipakai` | rule, llm |

---

## 5. State machine (kunci F2)

**`pesanan.status`** (orkestrasi checkout→escrow):
```
menunggu_pembayaran ──(bayar berhasil)──► dibayar[escrow tertahan]
menunggu_pembayaran ──(batas_hold lewat)──► kedaluwarsa (lepas kuota slot)
menunggu_pembayaran ──(batal pembeli)──► dibatalkan
dibayar ──(penyedia proses/booking checkin/barang dikirim)──► diproses
diproses ──(kunjungan selesai / barang diterima / auto N hari)──► selesai[escrow dirilis→payout]
dibayar|diproses ──(refund disetujui)──► refund
```

**`pembayaran.status`:**
```
menunggu ──► diproses ──(webhook settle)──► berhasil
menunggu ──(timeout)──► kedaluwarsa
diproses ──(webhook gagal)──► gagal
berhasil ──(refund)──► refund_sebagian | refund_penuh
```

**`transaksi.status`** (escrow ledger):
```
tertahan_escrow ──(pesanan selesai)──► dirilis ──(masuk payout)──►(payout berhasil)
tertahan_escrow|dirilis ──(refund)──► sebagian_refund | direfund
```

**`booking.status`:**
```
dipesan ──(pembayaran berhasil)──► terkonfirmasi ──(QR check-in)──► checkin ──► selesai
terkonfirmasi ──(tak hadir)──► noshow
dipesan|terkonfirmasi ──(refund/batal)──► batal
```

**`refund.status`:** `diajukan → disetujui → diproses → selesai` (atau `diajukan → ditolak`).

**`stempel.status`** (via `verifikasi`):
```
menunggu_verifikasi ──(verifikasi valid)──► terverifikasi (→ paspor & neraca F3)
menunggu_verifikasi ──(verifikasi invalid)──► ditolak
```
Aturan: transisi ilegal ditolak service; transisi pembayaran hanya dipicu **webhook terverifikasi**, bukan redirect klien.

---

## 6. Mekanika turunan (inti F2)

**Checkout multi-penyedia + hold kuota.** Satu `pesanan` boleh berisi oleh-oleh (UMKM A) + paket wisata (Agen B). Saat checkout: untuk tiap item berjadwal, `SELECT slot_jadwal ... FOR UPDATE`, cek `kuota_terpakai + jumlah <= kuota`, increment, buat `booking`; barang fisik cek `stok`. Kuota "ditahan" sampai `pesanan.kedaluwarsa_pada` (`batas_hold_menit`); job pelepas mengembalikan kuota bila tak dibayar. Gerbang test: **race dua checkout pada slot sisa 1 → hanya satu sukses**.

**Split escrow saat bayar berhasil.** Webhook `berhasil` → per penyedia dalam pesanan, tulis `transaksi(jenis=penjualan, status=tertahan_escrow)` dengan `porsi_reinvestasi = bruto × persen_reinvestasi`, `fee_platform = bruto × persen_fee`, `neto_penyedia = bruto − fee − porsi_reinvestasi`. Dana **ditahan di sub-account escrow gateway** (§8), belum di penyedia. Idempoten via `webhook.event_id` unik.

**Rilis & payout.** `pesanan → selesai` (kunjungan `checkin`+selesai, atau barang `diterima`, atau auto setelah N hari) → `transaksi.status = dirilis`. Job payout mengumpulkan `transaksi dirilis` yang `payout_id IS NULL` per penyedia → satu `payout` via disbursement API (tahap lanjut) atau daftar transfer manual bendahara (tahap 1). Inflow reinvestasi (`porsi_reinvestasi`) mengalir ke `dana_konservasi` di F3 (`sumber_id → transaksi`).

**Tukar poin transaksional.** `POST tukar` → lock saldo poin, validasi `>= biaya_poin` & `syarat` (mis. tingkat owner), buat `penukaran_poin`, tulis `transaksi_poin` negatif (idempoten), potong `stok` hadiah, terbitkan `kupon` bila perlu. Semua dalam satu transaksi DB — gagal di tengah = rollback penuh.

**Penerapan kupon.** Saat checkout dengan `kupon_id`: validasi `status=aktif`, dalam masa berlaku, `terpakai < batas_pakai`, `min_belanja` terpenuhi, penyedia dalam `penyedia_terbatas`. Hitung `diskon`, catat `pemakaian_kupon` (`UNIQUE(kupon,pesanan)`), increment `terpakai` atomik.

**Verifikasi aksi (anti-greenwashing, pintu F3).** Wisatawan selesaikan misi → buat `stempel(status=menunggu_verifikasi)` + `verifikasi`. Metode `qr_checkin` cek `qr_token` stasiun & jarak `ST_DWithin(lokasi, stasiun.lokasi, radius_m)`; `foto_geotag` cek bukti+geofence; `konfirmasi_pemandu` butuh `verifikator_id` berperan. `valid` → `stempel=terverifikasi`, update `paspor.ringkasan_dampak`. **Klaim tanpa bukti tervalidasi tak masuk paspor/neraca.**

**Pemandu rule-based.** `itinerary` menyusun dari `constraint` atas data lokal (`destinasi`, `layanan`, `paket`, `kalender`), menghormati kuota `slot_jadwal`; `estimasi` menjumlah harga sumber; `chat` retrieval ringan atas konten destinasi. LLM opsional di-gate di belakang service sendiri.

---

## 7. Gerbang `pytest` F2

- Checkout multi-item multi-penyedia menghasilkan `pesanan` + `pesanan_item` + `booking` konsisten; total = subtotal − diskon + ongkir.
- **Anti-overbook (race):** dua checkout paralel pada slot sisa 1 → satu sukses, satu `konflik`; `kuota_terpakai` tak pernah > `kuota`.
- Hold kadaluwarsa melepas kuota slot & stok kembali.
- Pembayaran hanya jadi `berhasil` lewat **webhook terverifikasi**; redirect klien saja tak mengubah status. `webhook.event_id` diproses **tepat-sekali** (kirim ulang tak menggandakan `transaksi`).
- **Split benar:** `bruto = fee_platform + porsi_reinvestasi + neto_penyedia`; `porsi_reinvestasi = bruto × persen_reinvestasi` per `pengaturan_desa`.
- Ledger `transaksi` append-only: refund = baris negatif; `Σ` per penyedia konsisten dengan payout.
- `pesanan → selesai` merilis escrow; payout hanya mengambil `transaksi dirilis` yang belum dipayout; tak ada dobel payout.
- Refund sebelum payout mengembalikan dana & menulis `transaksi(refund)`; refund sesudah `selesai` mengikuti kebijakan (ditolak/jalur manual).
- **Tukar poin:** saldo kurang → ditolak; sukses menulis `transaksi_poin` negatif idempoten & potong stok; redeem sama dua kali tak menggandakan.
- Kupon: kadaluwarsa/limit/penyedia di luar cakupan ditolak; `UNIQUE(kupon,pesanan)` cegah pakai ganda.
- Verifikasi menolak stempel di luar geofence / tanpa bukti sesuai `syarat`; hanya `terverifikasi` menaikkan `paspor`.
- Semua query domain terfilter `desa_id`; pesanan/pembayaran/transaksi desa A tak terlihat desa B.

---

## 8. ADR-02 — Escrow via gateway Indonesia

**Keputusan (Satria):** pembayaran memakai **model escrow** — platform (sebagai penatalayan komunitas) menahan dana sampai layanan/barang selesai, lalu merilis ke penyedia — dengan **payment gateway Indonesia** (QRIS + VA + e-wallet).

**Cara aman secara hukum (rekomendasi implementasi).** Jangan menahan dana di rekening bank platform sendiri — itu berpotensi masuk ranah **Penyedia Jasa Pembayaran (izin BI)** dan menanggung risiko kepatuhan dana pihak ketiga. Gunakan **fitur platform/marketplace dari gateway** yang menyediakan sub-account + split settlement + disbursement, sehingga escrow terjadi di sisi gateway, bukan di neraca platform:
- **Xendit** — `xenPlatform` (sub-account per penyedia), Split Rule, Disbursement API. QRIS/VA/e-wallet lengkap.
- **Midtrans** — Core/Snap untuk akseptasi + **Iris** untuk disbursement/payout.
Pilihan final antar keduanya = ADR terpisah saat integrasi; skema tabel sudah agnostik (`penyedia_gateway`, `konfig_gateway`, `ref_eksternal`).

**Alternatif yang tidak diambil.**
- *Direct-pay ke rekening penyedia* (paling ringan hukum): ditolak karena tak bisa menjamin `porsi_reinvestasi` otomatis, tanpa perlindungan pembeli, dan menyulitkan refund — bertentangan dengan reinvestment loop & positioning non-OTA.
- *Escrow di rekening platform sendiri:* ditolak karena beban izin/kepatuhan PJP terlalu berat untuk konteks PkM & komunitas.

**Konsekuensi.**
- Payout & refund bergantung API gateway → di F2 PkM diaktifkan **tahap 1 manual** (QRIS statis + verifikasi + transfer bendahara Pokdarwis), skema `disbursement` tinggal dinyalakan. Menyala penuh di Tahun 4–5.
- `porsi_reinvestasi` menjadi **otomatis & teraudit** di titik settle — inilah pembeda struktural dari Traveloka yang harus terlihat sampai level tabel (`transaksi`).
- **Blocker non-teknis tetap:** besaran `persen_reinvestasi`, syarat rilis escrow, dan kebijakan refund **wajib disepakati FGD** dengan Pokdarwis/perangkat desa sebelum go-live.

---

## 9. Batas F2 (sengaja ditunda)

- **F3:** `dana_konservasi` (inflow dari `transaksi.porsi_reinvestasi`), `pemakaian_kapasitas` (dari `booking`+check-in; opsional **blokir booking saat spot merah**), `neraca_regeneratif` (distribusi dari `neto_penyedia`), `monitoring_ekologi` + perluasan `verifikasi.entitas_tipe`, validasi silang `stempel.dampak` ↔ monitoring, `peristiwa` outbox (`transaksi_settle`, `booking_selesai`, `stempel_terverifikasi`).
- **F4:** `pengaturan_desa` + `bahasa`/`zona_waktu`/`status_go_live`, tema/white-label, ekspor data, provisioning multi-desa (semua tabel F2 sudah ber-`desa_id` → per-tenant otomatis).
- **Ditunda dalam F2 (thin slice PkM):** disbursement/refund otomatis gateway, LLM Pemandu (rule-based dulu), riwayat chat penuh — dirancang, diaktifkan Tahun 4–5.

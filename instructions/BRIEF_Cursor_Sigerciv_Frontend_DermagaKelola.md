# Brief Cursor — F-DermagaKelola: Dermaga Sisi Kelola (Penyedia + Bendahara)

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung. *(Fase F2 · thin-slice PkM = manual.)*
**Cakupan:** sisi operator — **penyedia** (slot editor, pesanan masuk, fulfillment, check-in, ledger, rekening) & **bendahara/pengelola** (konfirmasi pembayaran manual → split escrow, payout, keputusan refund, verifikasi rekening, pengaturan desa).
**Mode:** **Next.js web murni (belum PWA)** — tanpa offline. i18n via katalog; Rupiah/tanggal per locale.
**Prasyarat:** F2 backend hijau (B9/B10). Endpoint: `slot[/batch]`, `pesanan` (penyedia), `.../item/{id}/fulfillment`, `.../pembayaran/{id}/konfirmasi-manual`, `booking/{id}/checkin|selesai`, `GET transaksi`, `rekening[...]`, `payout[...]`, `refund/{id}/transisi`, `pengaturan` desa.
**Rujukan:** `KONTRAK_API_Fase2 §1–§4 & §5 (state machine) & §8 (DTO)`, brief F-Kurasi (`<PanelKeputusan>`), F-Penjelajah (`<PemindaiQR>`).

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `frontend/`: klien API terpusat (header `Idempotency-Key`), shell + konteks desa/peran, `<PanelKeputusan>` (F-Kurasi), `<PemindaiQR>` (F-Penjelajah), format uang/tanggal + i18n, tipe DTO `Transaksi/Payout/RekeningPenyedia/Refund/SlotJadwal/PengaturanDesa`. Typecheck/lint hijau. Ringkas file disentuh + risiko. **Jangan** duplikasi panel keputusan/pemindai; **jangan** sebar fetch uang.

---

## Aturan keselamatan uang (WAJIB)

- **Transisi uang = aksi manusia berperan, bukan verba klien bebas.** Yang mengubah uang: `konfirmasi-manual` (bendahara), `payout` + `payout/{id}/transisi`, `refund/{id}/transisi`, `booking/checkin|selesai`. Semua POST uang **wajib `Idempotency-Key`**.
- **Pembeli tak boleh konfirmasi bayarannya sendiri** → `konfirmasi-manual` hanya untuk `bendahara/pokdarwis/perangkat`; guard peran ketat.
- **Tanpa dobel payout:** `transaksi` ber-`payout_id` tak boleh dipayout lagi — UI hanya menawarkan `transaksi` `dirilis` + belum ter-payout.
- **Nomor rekening penuh tak pernah tampil** (mask `••••1234`); konfig gateway & `pembayaran.mentah` tak pernah tampil.

---

## 1. Penyedia — Slot, Pesanan, Check-in, Ledger, Rekening

**Slot editor** (`/[desa]/kelola/slot`): `POST /slot` tunggal, `POST /slot/batch` (materialisasi rentang tanggal), `PATCH` kuota/harga/status, `DELETE` (hanya bila `kuota_terpakai=0`). Ini yang membuat jadwal **bisa dijual** (melengkapi kalender info F1). Tampilkan kuota vs terpakai; cegah hapus bila sudah ada booking.

**Pesanan masuk** (`/[desa]/kelola/pesanan`): `GET pesanan` (sebagai penyedia) berisi item miliknya; update barang fisik `PATCH .../item/{id}/fulfillment`. **Check-in** booking: `POST /booking/{id}/checkin` via **`<PemindaiQR>`** (scan `kode_checkin`; di luar `tanggal_kunjungan` → `422 transisi_ilegal`). `POST /booking/{id}/selesai` menandai selesai (memicu evaluasi rilis escrow).

**Ledger transaksi** (`/[desa]/kelola/transaksi`, read-only): `GET transaksi?penyedia=` — tampilkan `bruto, fee_platform, porsi_reinvestasi, neto_penyedia, status` (`tertahan_escrow → dirilis → (payout)`). Transparansi split ke penyedia.

**Rekening payout:** `GET/POST/PATCH/DELETE rekening`, set `utama`; nomor selalu **ter-mask**. Status `terverifikasi` (di-set pengelola).

## 2. Bendahara/Pengelola — Konfirmasi, Payout, Refund, Verifikasi, Pengaturan

**Konfirmasi pembayaran manual** (`/[desa]/kelola/pembayaran`): antrean pembayaran `menunggu` + **bukti transfer** (foto) + kode unik. `POST .../pembayaran/{id}/konfirmasi-manual` **[Idempotency-Key]** → memicu **split escrow** (transaksi per penyedia `tertahan_escrow`; pesanan `dibayar`; booking `terkonfirmasi`). Tampilkan efek setelah konfirmasi. Guard: bukan pembeli.

**Payout** (`/[desa]/kelola/payout`): kumpulkan `transaksi` `dirilis` + belum ter-payout per `(penyedia)` → `POST /payout` **[Idempotency-Key]** (`metode=manual` tahap 1: bendahara transfer, lalu `POST /payout/{id}/transisi {aksi:"tandai_berhasil"}`; `tandai_gagal` melepas transaksi agar bisa diulang). Tampilkan rekening tujuan ter-mask + jumlah.

**Keputusan refund** (`/[desa]/kelola/refund`): antrean refund `diajukan`; **reuse `<PanelKeputusan>`** untuk `POST .../refund/{id}/transisi {aksi:"setuju|tolak|proses|selesai"}` + catatan. Refleksikan efek ke ledger/pembeli.

**Verifikasi rekening:** `PATCH .../rekening/{id}/verifikasi` (pokdarwis/perangkat/admin).

**Pengaturan desa** (`/[desa]/kelola/pengaturan`): `persen_reinvestasi, persen_fee_platform, batas_hold_menit, kebijakan_pembatalan, gateway`. **Flag tata kelola:** `persen_reinvestasi` **butuh kesepakatan FGD Pokdarwis** sebelum escrow nyata dinyalakan — tampilkan dengan penanda "perlu kesepakatan tata kelola", jangan sajikan sebagai angka yang bebas diubah sepihak. `gateway` default `manual` (PkM).

---

## Sistem desain

Reuse token & komponen Sigerciv; `<PanelKeputusan>`, `<PemindaiQR>`. Tabel ledger/payout dengan angka Rupiah ter-format + badge status. Uang selalu dari server (tak ada optimistic pada uang; boleh optimistic hanya untuk UI non-uang). A11y AA; empty/loading/error ramah; konfirmasi eksplisit untuk konfirmasi-manual & payout. Brand **Sigerciv**, label generik "Pengelola Desa".

---

## Gerbang (uji frontend — web, tanpa offline)

- **Guard peran:** hanya bendahara/pengelola melihat konfirmasi-manual/payout/refund; penyedia hanya data miliknya; pembeli tak punya aksi konfirmasi (403 ditangani).
- **Konfirmasi manual:** memicu split (tercermin di ledger: transaksi `tertahan_escrow`, pesanan `dibayar`); **[Idempotency-Key]** dikirim; retry tak menggandakan.
- **Payout:** hanya `transaksi` `dirilis` + belum ter-payout ditawarkan; **tanpa dobel payout**; `tandai_berhasil/gagal` jalan.
- **Refund:** keputusan via `<PanelKeputusan>` + catatan; efek tercermin.
- **Slot:** hapus terblokir bila `kuota_terpakai>0`; batch materialisasi jalan.
- **Check-in:** scan QR → `checkin`; di luar tanggal → 422 ditangani.
- **Rekening ter-mask;** konfig gateway/`mentah` tak tampil.
- **Pengaturan:** `persen_reinvestasi` bertanda "perlu FGD"; Rupiah/tanggal per locale; i18n; a11y axe bersih.

---

## Batas

Disbursement API otomatis & webhook gateway → aktif bertahap (non-PkM). Alur uang gateway (redirect/webhook) sisi pembeli → brief F-DermagaBeli. Aliran `porsi_reinvestasi` → `dana_konservasi` & Neraca → **F3**. Offline check-in lapangan → fase **PWA**.

---

## Blocker non-teknis (ingatkan sebelum go-live escrow)

Escrow nyata **tidak boleh** dinyalakan sebelum: (1) **FGD Pokdarwis** menyepakati `persen_reinvestasi` & tata kelola dana konservasi; (2) **ADR gateway** (Xendit xenPlatform vs Midtrans Iris) ditandatangani; (3) verifikasi domain Resend untuk email. Sampai itu, jalankan **jalur manual** saja.

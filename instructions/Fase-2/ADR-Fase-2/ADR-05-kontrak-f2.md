# ADR-05 — Kontrak API Fase 2 (Dermaga escrow + Penjelajah + Pemandu)

**Status:** Diterima (F2). Mengunci `KONTRAK_API_Kiluan_Fase2.md` sebagai kontrak yang diwujudkan B9–B13.
**Konteks pengambil keputusan:** Satria (technical lead) + co-architect.
**Terkait:** `ERD_Kiluan_Fase2.md`, **ADR-02** (escrow via gateway Indonesia), **ADR-0003** (async), scaffold `kiluan_f2/` (33 pytest hijau). Diperjelas oleh **ADR-06** (alokasi diskon).

## Konteks

Kontrak F2 memperkenalkan **uang** ke platform. Beberapa keputusan lintas-endpoint harus dikunci agar B9–B13 konsisten dan tak ditafsir ulang per modul oleh agen. Kandidatnya sudah dibahas di kontrak §1 & §10; ADR ini menetapkannya.

## Keputusan

Kontrak F2 **diterima apa adanya**, dengan enam pilar yang mengikat semua modul:

1. **Escrow model (turunan ADR-02).** `pesanan` menggeneralisasi barang+jasa; `transaksi` = ledger settlement **append-only per penyedia** dengan split `bruto = fee_platform + porsi_reinvestasi + neto_penyedia`. Invarian dijaga service **dan** CHECK DB.
2. **Idempotensi uang/poin lewat header `Idempotency-Key`** (bukan kunci turunan domain), disimpan Redis TTL 24 jam. Wajib pada `checkout`, `pembayaran`, `konfirmasi-manual`, `tukar`, `payout`, `refund`. Alasan: retry checkout terjadi sebelum `pesanan` ada → tak ada kunci alami.
3. **Status uang bukan verba klien.** Perpindahan status pembayaran/escrow hanya oleh **webhook terverifikasi** atau **aksi-manusia-berperan** (`konfirmasi-manual`, `payout`, `refund/transisi`, `checkin`). `/transisi {aksi}` F1 dipakai ulang terbatas (refund, payout manual). Klien yang kembali dari redirect **tak** menandai lunas.
4. **Webhook di luar path tenant** (`POST /webhooks/pembayaran/{gateway}`), signature-verified, tenant di-resolve `ref_eksternal → pembayaran → desa_id`, idempotensi `event_id` UNIQUE (tepat-sekali).
5. **Manual-first, gateway-ready satu bentuk.** Jalur manual (QRIS statis + bukti + `konfirmasi-manual`) memakai **jalur split escrow yang sama** dengan webhook; pindah ke otomatis = ubah `pengaturan_desa.gateway`, bukan refactor.
6. **Kebijakan refund konservatif.** Mudah **sebelum** `payout`/`selesai`; setelah `selesai` → `422 kebijakan_refund` (jalur manual). Tradeoff sadar untuk tahap 1.

## Konsekuensi

- B9–B13 mewujudkan kontrak ini tanpa menambah/menafsir ulang endpoint; scaffold `layanan_*` = spesifikasi perilaku, 33 uji = kontracuan regresi.
- **Blocker non-teknis tetap:** `persen_reinvestasi`, syarat rilis escrow, kebijakan pembatalan **wajib disepakati FGD** Pokdarwis/perangkat desa sebelum go-live. `PATCH /pengaturan` ada; nilai **tak** di-hard-code sepihak (seed placeholder ber-flag "belum disahkan").
- **Gateway final (Xendit vs Midtrans+Iris) = ADR terpisah** saat integrasi; B10 dibangun agnostik + manual-first.
- Pembeda struktural non-OTA (`porsi_reinvestasi` otomatis & teraudit di titik settle) **wajib terlihat** sampai level tabel & UI (struk/ringkasan penyedia).

## Alternatif yang tidak diambil

- **Idempotensi via `kode_pesanan`** (tanpa header): ditolak — belum ada saat request checkout pertama.
- **Webhook per-desa (URL ber-slug):** ditunda ke F4 — hanya rapi bila tiap desa punya akun gateway terpisah; di F2 satu URL global + resolve `ref_eksternal`.
- **Escrow di rekening platform sendiri / direct-pay:** sudah ditolak di ADR-02 (beban izin PJP; direct-pay merusak reinvestment loop).
- **Status uang lewat `/transisi {aksi}` seragam seperti F1:** ditolak untuk uang — status uang harus system-authoritative; klien tak boleh mengaku "dibayar".

## Pemicu tinjau ulang

Tinjau bila: gateway terpilih memaksa bentuk webhook/disbursement berbeda (buka ADR gateway), ATAU volume transaksi menuntut idempotensi berbasis DB alih-alih Redis, ATAU kebijakan refund tahap 1 terbukti terlalu kaku di lapangan (longgarkan lewat `kebijakan_pembatalan`, bukan refactor kontrak).

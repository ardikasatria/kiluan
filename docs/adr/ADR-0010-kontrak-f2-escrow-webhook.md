# ADR-0010 — Kontrak F2: escrow, idempotensi, webhook, manual-first

**Status:** Diterima (F2). Mengunci `KONTRAK_API_Kiluan_Fase2.md`.
**Terkait:** ADR-02 (escrow gateway), ADR-0006 (idempotensi poin), ADR-0011 (diskon), scaffold `kiluan_f2/`.

## Konteks

F2 memperkenalkan uang ke platform. Keputusan lintas-endpoint harus dikunci agar B9–B13 konsisten.

## Keputusan

1. **Escrow append-only.** `transaksi` per penyedia; split `bruto = fee + reinvestasi + neto`; invarian service + CHECK DB (`ck_transaksi_split`).
2. **Idempotensi header `Idempotency-Key`.** Wajib pada checkout, bayar, konfirmasi-manual, tukar, payout, refund. Store: Redis TTL (produksi) / in-memory (dev); bukan kunci turunan domain — retry checkout terjadi sebelum `pesanan` ada.
3. **Status uang bukan verba klien.** Hanya webhook terverifikasi atau aksi manusia berperan (`konfirmasi-manual`, payout, refund, check-in). Redirect gateway saja tidak mengubah status.
4. **Webhook global** `POST /webhooks/pembayaran/{gateway}` — gateway tidak tahu `slug`; resolve `ref_eksternal → pembayaran → desa_id`; `event_id` UNIQUE tepat-sekali.
5. **Manual-first, gateway-ready.** QRIS statis + bukti + bendahara memakai jalur `_settle` yang sama dengan webhook; `pengaturan_desa.gateway` mengontrol penyedia tanpa refactor endpoint.
6. **Refund konservatif.** Mudah sebelum `selesai`/payout; setelah `selesai` → `422 kebijakan_refund` (thin-slice PkM).

## Konsekuensi

- Nilai `persen_reinvestasi` / kebijakan pembatalan **placeholder** sampai FGD Pokdarwis — tidak di-hard-code sepihak untuk produksi.
- Gateway final (Xendit vs Midtrans) = ADR terpisah saat integrasi SDK; B10 sudah agnostik.

## Alternatif yang tidak diambil

- Idempotensi via `kode_pesanan` saja — ditolak (belum ada saat checkout pertama).
- Webhook per-desa — ditunda F4.
- Klien menandai lunas setelah redirect — ditolak (anti-fraud).

## Pemicu tinjau ulang

Gateway terpilih, volume transaksi menuntut idempotensi DB-native, atau kebijakan refund terbukti terlalu kaku di lapangan.

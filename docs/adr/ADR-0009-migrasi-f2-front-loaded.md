# ADR-0009 — Migrasi F2 front-loaded (satu increment `0004_f2`)

**Status:** Diterima (F2).
**Konteks pengambil keputusan:** Satria (technical lead) + co-architect.
**Terkait:** ADR-0005 (pola F1), `0004_f2.py`, ERD F2, brief B9–B13.

## Konteks

F2 menambah Dermaga (pesanan, pembayaran, escrow, slot, booking), kupon/poin, Penjelajah Lestari, dan Pemandu — puluhan tabel dengan FK silang ke F0/F1. Percabangan: satu migrasi `0004_f2` vs increment per pasangan B9–B13.

## Keputusan

**Satu migrasi increment `0004_f2` di B9** membuat seluruh skema F2 sekaligus (termasuk PostGIS GIST pada `stasiun_lestari`, CHECK `ck_transaksi_split`, UNIQUE `webhook_pembayaran.event_id`). B10–B13 **tidak menyentuh skema** — hanya repo SQL, layanan, API, dan UI.

Alasan selaras ADR-0005: upgrade atomik, dependensi escrow↔booking↔stempel terpenuhi sejak awal, Alembic tetap sinkron via `DATABASE_URL_SYNC`.

## Konsekuensi

- B9 memikul beban migrasi; modul berikutnya murni aplikasi.
- CHECK `bruto = fee_platform + porsi_reinvestasi + neto_penyedia` dijaga ORM + service; uji integrasi menolak baris tidak seimbang.
- PostGIS wajib untuk `stasiun_lestari` dan geofence Penjelajah (`ST_DWithin`).

## Alternatif yang tidak diambil

**Increment per modul (B9..B13).** Ditolak: F2 dikerjakan berurutan dalam satu fase; FK antar modul (mis. `stempel.booking_id`) membuat urutan migrasi rapuh.

## Pemicu tinjau ulang

Pecah increment bila modul F2 ditunda jauh (mis. Pemandu LLM penuh) dan skema belum diperlukan produksi.

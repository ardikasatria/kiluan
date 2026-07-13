# ADR-08 — Inflow reinvestasi & outbox transaksional F3

**Status:** Diterima (F3, di B14). Menjadi target-pindah saat B16 medallion menyala (lihat "Pemicu tinjau ulang").
**Konteks pengambil keputusan:** Satria (technical lead) + co-architect.
**Terkait:** ADR-07 (pilar 2 outbox, pilar 3 idempotensi, pilar 6 ledger), ADR-02 (escrow via gateway), `ERD_Kiluan_Fase3.md` §2/§6, brief B14 §Keputusan-2, scaffold `app/layanan_dana.py` (`inflow_dari_transaksi`) & `app/layanan_agregat.py` (kursor).
**Catatan nomor:** samakan dgn indeks `docs/adr/`; geser bila 08 sudah terpakai.

## Konteks

ERD §6: `transaksi→settle` (F2) harus menulis `dana_konservasi(masuk, jumlah=porsi_reinvestasi)` agar ledger konservasi & halaman transparansi publik akurat. Dua cara menerapkannya, dengan konsekuensi berbeda saat medallion/ETL F3 (B16) **belum** aktif di PkM:

- **(A) Sinkron di jalur settle** — service settle memanggil `dana.inflow_dari_transaksi(trx)` dalam transaksi DB yang sama.
- **(B) Konsumer outbox** — settle hanya menulis `peristiwa(transaksi_settle)`; consumer terpisah menerapkan inflow.

Opsi B "lebih murni" (settle tak tahu-menahu soal konservasi) tetapi menuntut consumer + scheduler yang **belum ada** di PkM, dan membuat ledger transparansi **tertunda** (tidak langsung benar setelah bayar). Opsi A membuat ledger benar seketika tetapi menautkan jalur settle F2 ke F3.

## Keputusan

**Diambil: (A) inflow sinkron-di-settle, idempoten, dengan emisi outbox berdampingan untuk masa depan.**

1. **Terapkan inflow di jalur settle F2** (B14 menyentuh settle secara eksplisit) memanggil `inflow_dari_transaksi` dalam transaksi yang sama.
2. **Idempotensi di DB, bukan aplikasi:** `INSERT … dana_konservasi … ON CONFLICT (sumber_tipe, sumber_id) DO NOTHING` dgn **UNIQUE partial WHERE sumber_tipe='transaksi'`**. Settle diproses ulang → satu inflow, bukan dobel.
3. **Tetap emit `peristiwa(transaksi_settle)`** ke outbox dalam transaksi yang sama — agar B16 (analitik) dan/atau konsumer inflow masa depan punya sumber event tanpa perubahan data.
4. **Kunci pola outbox transaksional F3 secara umum:** service domain menulis `peristiwa` dalam transaksi yang sama dgn perubahan domain (`transaksi_settle`, `monitoring_terverifikasi`, lalu `booking_selesai`/`stempel_terverifikasi` di B16). Konsumsi ETL tepat-sekali via kursor `diproses_pada`.
5. **Dua gaya idempotensi ditegakkan DB:** sinkron monitoring `ON CONFLICT (id) DO NOTHING` (UUIDv7 klien); outflow dana via `Idempotency-Key` header.

## Konsekuensi

- **Ledger transparansi akurat seketika** setelah pembayaran berhasil — penting karena transparansi publik adalah pembeda inti (ADR-07 pilar 4).
- **B14 menyentuh service settle F2** (diizinkan eksplisit di Langkah 0). Perubahan minimal: satu panggilan `inflow` + satu emisi `peristiwa`, keduanya idempoten; **tak** mengubah aturan escrow/split (ADR-02 tetap).
- **Aman dipindah ke (B) tanpa migrasi data:** karena inflow diketik `sumber_id` unik, konsumer outbox B16 yang menerapkan inflow akan `ON CONFLICT DO NOTHING` atas baris yang sama → transisi A→B **idempoten**, tak menggandakan, tak butuh backfill.
- **Batas verifikasi jujur:** scaffold menguji idempotensi inflow & kursor di memori; penegakan `UNIQUE partial` nyata + perilaku `SELECT FOR UPDATE`/transaksi settle diuji di integrasi Postgres (B14), bukan di unit memori.

## Alternatif yang tidak diambil

- **(B) Konsumer outbox sejak awal.** *Menarik* (settle bersih dari konservasi) tetapi **ditolak untuk PkM**: menambah consumer + scheduler yang belum ada, dan menunda kebenaran ledger transparansi (jeda antara bayar dan tampil). Tetap menjadi **target** begitu B16 menyala — karena itu emisi `peristiwa(transaksi_settle)` sudah disiapkan sekarang.
- **Hitung inflow saat-baca (on-read).** Ditolak — melanggar ledger append-only (ADR-07 pilar 6); inflow adalah fakta yang harus tercatat, bukan turunan.
- **Idempotensi read-then-write di aplikasi.** Ditolak — rawan race pada settle konkuren/retry gateway; constraint DB adalah satu-satunya penjaga yang benar (sejalan disiplin `ON CONFLICT` F1).
- **Menahan dana di akun platform lalu mencatat manual.** Ditolak — bertentangan ADR-02 (escrow via fitur gateway, platform bukan penampung dana).

## Pemicu tinjau ulang

Pindah ke **(B) konsumer outbox** saat B16 medallion + penjadwalan aktif: inflow dipindah dari jalur settle ke konsumer `peristiwa(transaksi_settle)`. Transisi aman-data karena idempotensi `sumber_id`. Ditinjau lebih awal bila jalur settle F2 jadi rumit atau retry gateway sering memicu settle ganda (uji ulang `UNIQUE partial`).

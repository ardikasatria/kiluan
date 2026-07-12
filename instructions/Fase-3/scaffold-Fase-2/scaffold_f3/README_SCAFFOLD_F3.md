# Scaffold Python F3 — Kiluan (Jejak Lestari + Anjungan Data)

Domain layer **bebas-infrastruktur** (tanpa I/O, tanpa DB): repo in-memory async +
jam terkontrol. Diturunkan dari `KONTRAK_API_Kiluan_Fase3.md` (kandidat ADR-07),
yang diturunkan dari `ERD_Kiluan_Fase3.md`. Semua nama field snake_case Bahasa Indonesia.

## Jalankan
```bash
pip install pytest pytest-asyncio
pytest -q          # 33 passed
```

## Struktur
```
app/
  enums.py             # enum F3 (ERD §4)
  errors.py            # GalatDomain + kode internal (kontrak §1)
  util.py              # uuid7 (keyset), Jam, haversine geofence, paginasi
  model.py             # dataclass entitas F3 + ringkas F2 (Transaksi/Booking/Stempel)
  repo.py              # RepoMemori async, isolasi tenant per desa_id
  layanan_monitoring.py  # catat, sync offline idempoten, verifikasi geofence/manual, emit outbox
  layanan_dana.py        # ledger append-only, inflow otomatis idempoten, saldo transparan
  layanan_kapasitas.py   # level lampu vs ambang, projeksi publik, hook blokir booking F2
  layanan_agregat.py     # job guard konkuren, outbox ETL tepat-sekali, gold + rekonsiliasi
  layanan_neraca.py      # skor tiga pilar dari data terverifikasi, anti-greenwashing, kunci periode
  layanan_laporan.py     # draf → final
tests/                 # 33 uji, memetakan 13 gerbang kontrak §10
```

## Pemetaan gerbang kontrak §10 → uji

| Gerbang §10 | Uji |
|---|---|
| 1. Rekonsiliasi gold == sumber | `test_agregat::test_rekonsiliasi_gold` |
| 2. Saldo = Σmasuk−Σkeluar; inflow=Σreinvestasi; idempoten | `test_dana::test_saldo_masuk_minus_keluar`, `test_inflow_idempoten` |
| 3. Outflow tanpa bukti / sumber transaksi manual | `test_dana::test_outflow_wajib_bukti`, `test_sumber_transaksi_manual_ditolak` |
| 4. Ambang kapasitas + publik tanpa kunjungan mentah | `test_kapasitas::test_ambang_level_tepat`, `test_projeksi_publik_sembunyikan_kunjungan` |
| 5. Blokir booking merah (opsional, gated) | `test_kapasitas::test_blokir_booking_saat_merah`, `test_blokir_mati_tetap_lolos` |
| 6. Hanya terverifikasi masuk skor | `test_neraca::test_hanya_terverifikasi_masuk_skor` |
| 7. Anti-greenwashing (klaim tanpa dukungan = 0) | `test_neraca::test_anti_greenwashing` |
| 8. Outbox tepat-sekali (kursor idempoten) | `test_agregat::test_outbox_tepat_sekali` |
| 9. Verifikasi geofence / bukti | `test_monitoring::test_verifikasi_geofence_luar`, `test_verifikasi_bukti_kurang` |
| 10. Sinkron offline idempoten | `test_monitoring::test_sync_idempoten`, `test_sync_sukses_parsial` |
| 11. Periode terkunci (neraca & laporan) | `test_neraca::test_periode_terkunci`, `test_tenant_dan_paginasi::test_laporan_finalkan_dobel` |
| 12. Job konkuren ditolak | `test_agregat::test_job_konkuren_ditolak` |
| 13. Isolasi tenant + keyset stabil | `test_tenant_dan_paginasi::*` |

## Batas verifikasi (jujur)
- Ini **domain murni**: PostGIS `ST_DWithin` diemulasi haversine; `SELECT FOR UPDATE`
  slot & lock DB **belum** diuji di sini (ranah adapter async SQLAlchemy — brief Cursor).
- Medallion nyata (Parquet/DuckDB/MinIO) diringkas jadi `proses_outbox_gold` in-memory
  untuk membuktikan **kursor tepat-sekali** & **rekonsiliasi**; pipeline fisik = brief F-analitik.
- Bobot neraca & ambang daya dukung memakai **placeholder** (`BobotNeraca`) — nilai
  sebenarnya **blocker FGD Pokdarwis**, bukan konstanta produksi.

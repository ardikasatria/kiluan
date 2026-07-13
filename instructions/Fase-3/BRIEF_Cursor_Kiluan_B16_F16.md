# Brief Cursor — B16/F16 Kiluan (Anjungan Data)

**Untuk:** agen Cursor (backend + frontend berpasangan).
**Prasyarat:** B14/F14 + B15/F15 tuntas & hijau. **Tak ada migrasi baru** — `peristiwa, job_analitik, agregat_harian, laporan_bulanan` sudah dibuat `0004_f3`.
**Rujukan wajib:** `BLUEPRINT_…md` (medallion bronze→silver→gold, dashboard native ECharts/Plotly), `ERD_Kiluan_Fase3.md` (§3 Anjungan Data, §6 alur ETL), `KONTRAK_API_Kiluan_Fase3.md` (§1 outbox internal + job-authoritative, §3 ops, §6), scaffold `scaffold_f3/app/layanan_agregat.py` + `layanan_laporan.py`.
**Cakupan B16/F16:** medallion **outbox/snapshot → gold `agregat_harian`** (tepat-sekali), **ops job control** (trigger + observabilitas), **dashboard** Anjungan Data (ECharts/Plotly), **laporan bulanan PDF**, dan **penjadwalan** compute (gold + kapasitas/neraca + draf laporan).
**Prinsip:** blueprint-first, multi-tenant, **nilai turunan read-only (job-authoritative)** — tak ada endpoint tulis publik atas agregat/skor, hanya baca + trigger job. Outbox **internal** (tak ada `POST /peristiwa`).

> **Realita PkM (baca dulu).** B16 sebagian besar **roadmap Tahun 4–5**. Brief ini memisahkan **irisan tipis PkM** (§A: gold minimal via rollup SQL + laporan manual, tanpa DuckDB/scheduler) dari **medallion penuh** (§B: Parquet/DuckDB/MinIO + penjadwalan). Kerjakan §A dulu; §B hanya bila kapasitas & kebutuhan nyata ada. Jangan over-build analitik yang belum ada datanya.

---

## Langkah 0 — Orientasi repo (template)

Sebelum kode, agen:
1. Baca `docs/ERD_Kiluan_Fase3.md` §6 (peristiwa→bronze→silver→gold; kursor `diproses_pada`) + `docs/KONTRAK_API_Kiluan_Fase3.md` §1 (job-authoritative, outbox internal), §3 (ops), §6 (agregat/laporan), dan scaffold `app/layanan_agregat.py` (job guard + ETL tepat-sekali + rekonsiliasi) & `layanan_laporan.py`.
2. Petakan repo pasca-B15. Sumber yg dibaca ETL: outbox `peristiwa` (ditulis B14: `transaksi_settle`, `monitoring_terverifikasi`) + tabel sumber F1/F2 (`booking, transaksi, stempel, kontribusi, sertifikasi_owner`). Target tulis: `agregat_harian`, `job_analitik`, `laporan_bulanan`. `analytics/` (DuckDB/Parquet) & `infra/minio` untuk §B.
3. Konvensi: filter `desa_id` di baca dashboard; ops job **global** (`desa_id=null`) → **admin** saja; agregat `kode_metrik` di luar enum → `422 metrik_tidak_dikenal`; compute → **job** dgn guard konkuren; kursor `diproses_pada` = **tepat-sekali** (run ulang tak menggandakan).
4. `cd backend && pytest -q` **hijau** (F0–F3 B14/B15 terport). Jangan pecahkan.
5. **Jangan** ubah domain/DTO F0–F3 kecuali diperintah. Agregat/skor **tak boleh** ditulis lewat endpoint publik — bila tergoda, itu pelanggaran kontrak §1.
6. Tak ada migrasi baru. §B menambah **layout MinIO/DuckDB** (infra), bukan skema Postgres.

Keluaran Langkah 0: ringkasan 5–10 baris (file + risiko).

---

## Keputusan yang harus dikunci SEBELUM B16

1. **Ingesti bronze (rekomendasi PkM: snapshot inkremental via kursor, bukan CDC).** Bronze = snapshot tabel sumber via kursor (`id`/`diperbarui_pada`); outbox dipakai untuk metrik ber-semantik event (reinvestasi/kontribusi). Tepat-sekali via kursor `diproses_pada`. Alternatif CDC/Debezium ditolak (overkill PkM).
2. **Katalog metrik yg benar-benar diisi (freeze).** PkM minimal: `pendapatan, kunjungan, kontribusi, umkm_aktif, adopsi_regeneratif, booking_per_tingkat`. Sisanya enum tapi kosong sampai ada data. Jangan bikin chart untuk metrik tak berdata.
3. **Render PDF laporan (rekomendasi: server-side WeasyPrint dari template HTML → MinIO presigned F0).** Snapshot angka saat `finalkan` (bukan render-on-read) agar laporan final immutable. Alternatif reportlab (lebih rendah level) → hanya bila butuh layout khusus.
4. **Penjadwalan (rekomendasi PkM: trigger manual/ops; scheduler opsional).** Bila perlu, **APScheduler in-process** (bukan Celery-beat) untuk gold harian + draf laporan awal bulan. Untuk PkM cukup tombol "hitung" (steward). Kunci bersama Satria.
5. **DuckDB ad-hoc = alat ops, BUKAN API tenant.** Query API atas gold/Parquet ditunda **F4** (kepemilikan/ekspor data). Jangan ekspos endpoint kueri bebas.

---

## §A — Irisan tipis PkM (kerjakan dulu)

### B16-A (backend)
Langkah 0, lalu:

- **`repo/sql.py`** +`RepoAgregat/Job/Laporan` (baca `peristiwa` + tabel sumber). **Idempotensi gold di DB:** `agregat_harian` upsert `ON CONFLICT (desa_id, tanggal, kode_metrik, dimensi_hash) DO UPDATE` (dimensi dikanonikalisasi → hash stabil). Kursor: `UPDATE peristiwa SET diproses_pada=now() WHERE id = ANY(...)` dalam transaksi ETL.
- **Wujudkan `layanan_agregat.py`** → **gold rollup SQL** (tanpa DuckDB dulu): agregasi harian dari sumber ke `agregat_harian` untuk katalog §Keputusan-2. Rekonsiliasi: `Σ agregat(pendapatan) == Σ transaksi.bruto` periode uji.
- **Ops (admin, global)** (KONTRAK §3): `POST /ops/analitik/jalankan {lapisan:"gold", desa_id?}` → enqueue `job_analitik`; lapisan sama `berjalan` → `409 job_sedang_berjalan`. `GET /ops/analitik/job?lapisan=&status=&desa_id=`, `GET /ops/analitik/job/{id}` (observabilitas: `baris_masuk/keluar`, `galat`).
- **Baca dashboard (tenant)** (KONTRAK §6.1): `GET /desa/{slug}/agregat?kode_metrik=&dari=&sampai=&dimensi=` (metrik tak dikenal → `422`), `GET /desa/{slug}/agregat/ringkas?periode=` (bundel beranda). **Nudge owner**: `kode_metrik=booking_per_tingkat` join `sertifikasi_owner` — owner hanya irisan listingnya, bukan agregat desa.
- **Laporan** (KONTRAK §6.2): `POST /desa/{slug}/laporan {periode}` → draf (`ringkasan` jsonb dari gold); `GET` list + `GET /{periode}`; `POST /desa/{slug}/laporan/{id}/transisi {aksi:"finalkan"}` → snapshot + **render PDF** → MinIO (`file_media_id`). Finalkan yg sudah `final` → `422 transisi_ilegal`/`periode_final`.
- **Tes:** unit `test_agregat`/`test_laporan` port hijau; **integrasi**: rekonsiliasi gold==sumber; run ETL dua kali → agregat **tak** berganda (kursor tepat-sekali); compute konkuren → `409`; `metrik_tidak_dikenal` → `422`; finalkan dobel → `422`; isolasi `desa_id` (agregat A tak terlihat B → 404); ops job global butuh admin (403 utk non-admin).

### F16-A (frontend)
Langkah 0, lalu:

- **Dashboard Anjungan Data** `/[desa]/data` (pengelola): grafik **ECharts/Plotly native** — pendapatan & kunjungan (garis), kontribusi (area), umkm_aktif & adopsi_regeneratif (kartu), filter `periode`/`dimensi`. **Indikator kesegaran**: "data per `diperbarui_pada`" (karena job-authoritative).
- **Kartu nudge owner** (di dashboard owner): "listing 🐬 Lumba-Lumba rata-rata X% lebih banyak booking" dari `booking_per_tingkat` — mendorong Naik Kelas berbasis data.
- **Laporan bulanan** `/[desa]/data/laporan`: daftar per periode, generate draf, **finalkan → unduh PDF**; draf bisa dilihat, final immutable.
- **Panel ops job** (steward/admin): tombol "jalankan gold", daftar run + status/galat (observabilitas).
- **Gerbang:** dashboard menampilkan angka yg **cocok** dgn sumber (rekonsiliasi); kesegaran data jelas; laporan final menghasilkan PDF stabil; non-admin tak melihat panel ops; metrik tak berdata tak dirender sebagai chart kosong yg menyesatkan.

---

## §B — Medallion penuh (roadmap Tahun 4–5, aktifkan bila perlu)

Hanya bila volume/kebutuhan nyata: **bronze** (snapshot Parquet di MinIO) → **silver** (bersih+join, DuckDB) → **gold** (tulis `agregat_harian` Postgres). `analytics/` dgn DuckDB attach ke Parquet; `POST /ops/analitik/jalankan {lapisan:"bronze"|"silver"|"gold"}` menjalankan tahap; tiap tahap satu `job_analitik`. **APScheduler** untuk gold harian + kapasitas/neraca + draf laporan awal bulan. DuckDB ad-hoc = konsol ops (bukan API tenant). Exactly-once tetap via kursor `diproses_pada`.

**Tradeoff (jujur):** §A memberi dashboard & laporan **cukup** untuk PkM tanpa infra analitik berat; §B menambah skalabilitas & kueri ad-hoc tapi biaya operasional (MinIO/DuckDB/scheduler) yg tak sepadan sampai data cukup besar. Pindah §A→§B **tak** mengubah kontrak (endpoint sama; hanya isian `lapisan` bertambah) → aman ditunda.

---

## Penutup B16 & penutup F3

```
B14/F14 ──► B15/F15 ──► B16/F16 (INI)
 monitoring   daya dukung    §A gold rollup + dashboard + laporan  ── PkM
 + dana       + neraca       §B medallion penuh + scheduler        ── roadmap
```

1. **Kunci keputusan §1–§5** (ADR pendek: ingesti bronze snapshot+kursor, katalog metrik, PDF WeasyPrint snapshot-saat-final, penjadwalan manual/APScheduler, DuckDB ops-only).
2. **Hijaukan gerbang B16** (subset §10: rekonsiliasi, tepat-sekali, job konkuren, metrik_tidak_dikenal, laporan final, isolasi tenant, ops-admin) → **tutup F3**: jalankan seluruh 13 gerbang §10 end-to-end.
3. **Tutup F3** hanya §A untuk PkM; §B masuk roadmap Tahun 4–5 bersama replikasi multi-desa **F4 (Nusantara)** — di mana agregat/neraca per-desa jadi dasar ekspor & kepemilikan data komunitas (query API atas gold).
4. Seluruh output F3 (agregat/neraca/ledger/monitoring) ber-`desa_id` → F4 = tambah kebijakan RLS + provisioning tenant, **bukan** refactor kontrak.

> **Ingat guardrail.** Realistis tuntas PkM = F0 + F1 + thin slice F2, dan dari F3 hanya **B14 (monitoring+dana) + B15 (neraca dasar) + B16-§A (dashboard minimal)**. Otomasi medallion penuh, DuckDB, scheduler, laporan terjadwal = roadmap. Jangan over-promise; petakan sisanya ke Tahun 4–5.

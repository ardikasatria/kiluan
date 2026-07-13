# Brief Cursor — B15/F15 Kiluan (Daya Dukung & Neraca Regeneratif)

**Untuk:** agen Cursor (backend + frontend berpasangan).
**Prasyarat:** B14/F14 tuntas & hijau (migrasi `0004_f3`, monitoring offline, ledger dana konservasi). **Tak ada migrasi baru** — seluruh tabel F3 sudah dibuat `0004_f3`.
**Rujukan wajib:** `BLUEPRINT_…md`, `ERD_Kiluan_Fase3.md` (§3 daya_dukung/pemakaian/neraca, §2 hook F2, §5 kunci periode), `KONTRAK_API_Kiluan_Fase3.md` (§1, §2, §5.1/§5.3), scaffold `scaffold_f3/app/layanan_kapasitas.py` + `layanan_neraca.py`.
**Cakupan B15/F15:** `daya_dukung` (konfig) + `pemakaian_kapasitas` (job harian, level lampu) + **hook blokir booking F2**, dan `neraca_regeneratif` (skor tiga pilar + **anti-greenwashing** validasi silang `stempel.dampak` ↔ monitoring terverifikasi).
**Prinsip:** blueprint-first, multi-tenant, enum+CHECK, snake_case Indonesia, lintas-tenant→404, **nilai turunan read-only (job-authoritative)**, parameter regeneratif **bukan hardcode**.

> **Cara pakai.** B15/F15 paralel dgn mock. Pasangan **WAJIB** dibuka **Langkah 0**. Tak menyentuh skema `0004_f3` (kecuali **hook checkout F2**, eksplisit di §Keputusan). Hijaukan gerbang sebelum B16.

---

## Langkah 0 — Orientasi repo (template)

Sebelum kode, agen:
1. Baca `docs/ERD_Kiluan_Fase3.md` §3 (daya_dukung/pemakaian_kapasitas/neraca_regeneratif) + §2 (hook F2) + `docs/KONTRAK_API_Kiluan_Fase3.md` §5.1/§5.3, dan scaffold `app/layanan_kapasitas.py`/`layanan_neraca.py` yang diwujudkan.
2. Petakan repo pasca-B14: `backend/app/{domain,skema,layanan,repo,model,api,inti}`. Catat **disentuh** vs **rujukan**. Tabel F3 sudah ada (`0004_f3`); repo `RepoIndikator/Monitoring/DanaKonservasi/Peristiwa` sudah dari B14. Sumber lintas-fase yang dibaca: `booking` (F2), check-in `stasiun_lestari`/`stempel` (F2), `transaksi` (F2), `sertifikasi_owner` (F1).
3. Konvensi: filter `desa_id` di semua query; amplop `{"galat":{…}}`; lintas-tenant→404; keyset `?batas=&kursor=`; **compute = job**, endpoint tulis publik atas agregat/skor **tidak ada** (hanya baca + trigger job).
4. `cd backend && pytest -q` **hijau** (F0–F3 B14 terport). Jangan pecahkan.
5. **Jangan** ubah domain/DTO F0–F3 kecuali diperintah. Di sini satu perubahan eksplisit: **hook checkout F2** membaca `kapasitas/hari-ini` (opsional, ber-flag). Perilaku lain lewat `layanan/`+`repo/`+`api/`.
6. Tak ada perubahan skema → tak ada migrasi baru. Bila ternyata butuh kolom baru, **STOP** & konfirmasi Satria (kemungkinan ERD kurang; jangan `create_all`).

Keluaran Langkah 0: ringkasan 5–10 baris (file + risiko) sebelum ngoding.

---

## Keputusan yang harus dikunci SEBELUM B15

1. **Ambang daya dukung & bobot neraca = input Pokdarwis (blocker FGD).** `kapasitas_harian`, `ambang_kuning`, `ambang_merah` per destinasi; bobot tiga pilar + target (`BobotNeraca` di scaffold = **placeholder**). Endpoint hidup, nilai **jangan** di-hardcode/di-seed final sebelum FGD.
2. **Blokir vs peringatkan (rekomendasi: peringatkan default, blokir opt-in per-desa).** Simpan flag di `pengaturan_desa` (mis. `blokir_booking_merah=false`). Hook checkout F2 hanya menolak `409 daya_dukung_terlampaui` bila flag aktif; jika mati → hanya kirim peringatan. Konfirmasi Satria.
3. **Peta klaim→indikator untuk anti-greenwashing.** `stempel.dampak` key → `indikator_ekologi.kode` (mis. `mangrove→mangrove_survival`, `karang→kesehatan_karang`, `sampah→sampah_terkumpul`). Kunci peta ini bersama Pokdarwis; klaim yg indikatornya **tak terverifikasi** dalam periode → **0 kontribusi** skor ekologi.
4. **Sumber `kunjungan` pemakaian.** `kunjungan = booking terkonfirmasi (F2) + check-in Stasiun Lestari (stempel terverifikasi, F2)` per destinasi per tanggal. Kunci definisi agar rasio konsisten.

---

## Pasangan B15/F15 — Daya Dukung & Neraca

**Tujuan.** Menutup lingkar regeneratif jadi **terukur**: kapasitas destinasi memberi sinyal lampu (dan opsional membatasi booking), dan **Neraca Regeneratif** menjadi KPI setara GMV yang **tak bisa di-greenwash** — skor ekologi hanya dari data terverifikasi.

### B15 (backend)
Langkah 0, lalu:

- **`repo/sql.py`** +`RepoDayaDukung/PemakaianKapasitas/NeracaRegeneratif` (+read-only ke `booking`/`stempel`/`transaksi`) — signature 1:1 scaffold. **Upsert** `daya_dukung` via `ON CONFLICT (desa_id, destinasi_id) DO UPDATE`; `pemakaian_kapasitas` via `ON CONFLICT (desa_id, destinasi_id, tanggal) DO UPDATE`; `neraca_regeneratif` via `ON CONFLICT (desa_id, periode) DO UPDATE` **WHERE NOT terkunci** (periode final tak tertimpa).
- **Wujudkan `layanan_kapasitas.py`** → endpoint (KONTRAK §5.1):
  - `GET /desa/{slug}/daya-dukung`, `PUT /desa/{slug}/daya-dukung/{destinasi_id}` (pokdarwis/perangkat/admin) — validasi `0 < kuning < merah <= 1` → `422 validasi_gagal`.
  - `GET /desa/{slug}/kapasitas?destinasi_id=&dari=&sampai=` (publik: `level`+`rasio`; pengelola: +`kunjungan`), `GET /desa/{slug}/kapasitas/hari-ini`.
  - `POST /desa/{slug}/kapasitas/hitung {tanggal?}` (steward/admin) → **job**; lapisan/compute yg sama sedang berjalan → `409 job_sedang_berjalan`. Hitung `kunjungan` (Keputusan §4) → `rasio` → `level` (ambang **inklusif**: `rasio>=merah→merah`).
- **Hook blokir booking F2** (eksplisit, ber-flag): pada `POST …/checkout` (F2), baca `kapasitas/hari-ini` destinasi+tanggal; bila `pengaturan_desa.blokir_booking_merah` **dan** `level==merah` → `409 daya_dukung_terlampaui`; selain itu lolos (opsi sisipkan peringatan di respons). Baca **snapshot** `pemakaian_kapasitas` (murah), bukan hitung live di jalur panas.
- **Wujudkan `layanan_neraca.py`** → endpoint (KONTRAK §5.3):
  - `GET /desa/{slug}/neraca?dari=&sampai=` (publik: 4 skor + ringkas), `GET /desa/{slug}/neraca/{periode}` (pengelola: `komponen` penuh).
  - `POST /desa/{slug}/neraca/hitung {periode}` (steward/admin) → **job**; periode `terkunci` → `409 periode_final`.
  - **Anti-greenwashing (inti B15):** `skor_ekologi` **hanya** dari `monitoring_ekologi` `status=terverifikasi` dalam periode. Validasi silang: iterasi `stempel` terverifikasi, hitung `klaim_diklaim` vs `klaim_tervalidasi` (klaim dihitung **hanya** bila `indikator_kode` klaim ada di himpunan indikator terverifikasi periode). Klaim tak didukung → **tak** menaikkan skor. Bobot dari **konfigurasi** (Keputusan §1), bukan konstanta.
- **Tes:** unit `test_kapasitas`/`test_neraca` port hijau; **integrasi**: level memicu tepat di ambang; publik tak melihat `kunjungan` mentah; blokir aktif+merah → `409`, blokir mati+merah → lolos; hanya monitoring terverifikasi menaikkan `skor_ekologi`; stempel klaim tanpa dukungan → skor tak naik & `komponen.klaim_tervalidasi=0`; hitung ulang periode terkunci → `409 periode_final`; compute konkuren → `409 job_sedang_berjalan`; isolasi `desa_id` (neraca/kapasitas A tak terlihat B → 404).

### F15 (frontend)
Langkah 0, lalu:

- **Konfigurasi daya dukung** (pokdarwis/perangkat) `/[desa]/lestari/daya-dukung`: per destinasi set `kapasitas_harian` + ambang; **tandai jelas** "angka disepakati Pokdarwis" (bukan default sistem).
- **Papan kapasitas** `/[desa]/lestari/kapasitas`: lampu 🟢🟡🔴 per destinasi + rasio; tombol "hitung ulang hari ini" (steward). Publik: badge "spot ramai/penuh" (level saja, tanpa angka kunjungan).
- **Peringatan di checkout** (integrasi F2): saat booking spot `kuning/merah`, tampilkan peringatan kapasitas; bila `blokir` aktif & `merah` → blokir dgn pesan ramah + saran tanggal lain.
- **Neraca Regeneratif** `/[desa]/lestari/neraca`: skor tiga pilar + total (KPI setara GMV), tren antar-periode; **panel kejujuran** yg menampilkan `klaim_diklaim` vs `klaim_tervalidasi` (transparansi anti-greenwashing). Ringkas neraca **publik** di halaman desa.
- **Gerbang:** ubah ambang mengubah level; publik tak lihat kunjungan mentah; checkout memperingatkan (dan memblokir bila flag aktif) saat merah; skor ekologi hanya bergerak oleh data terverifikasi; klaim tanpa bukti terlihat sebagai "belum tervalidasi", tak mengangkat skor.

**Batas B15:** medallion (outbox→bronze/silver/gold), `agregat_harian` + dashboard ECharts/Plotly, `laporan_bulanan` PDF → **B16**. Neraca di B15 dihitung on-demand (trigger steward); penjadwalan otomatis → B16.

---

## Penutup B15 & langkah selanjutnya

```
B14/F14 ──► B15/F15 (INI) ──► B16/F16 (Anjungan Data)
 monitoring+dana    daya dukung+neraca+     medallion→gold, dashboard,
                    anti-greenwashing        laporan PDF, penjadwalan job
```

1. **Kunci keputusan §1–§4** (ADR pendek: hook blokir ber-flag, peta klaim→indikator, definisi kunjungan). Bobot & ambang tetap **placeholder sampai FGD**.
2. **Hijaukan gerbang B15** (subset §10: ambang, blokir, hanya-terverifikasi, anti-greenwashing, periode_final, job konkuren, isolasi) sebelum B16.
3. **Blocker FGD** (bobot neraca + ambang daya dukung + kebijakan blokir) — forum yg sama dgn dana konservasi B14. Endpoint hidup, **jangan go-live** dgn default.
4. Neraca & kapasitas sudah ber-`desa_id` → medallion B16 tinggal mengisi `agregat_harian` & menjadwalkan `hitung`, bukan refactor.

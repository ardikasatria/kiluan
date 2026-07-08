# Scaffold F1 — Kiluan (Python murni, async, in-memory)

Domain layer Fase 1 tanpa dependensi DB/web (pola sama seperti F0/B1: async end-to-end,
repositori in-memory, `pytest-asyncio`). Sumber kebenaran: `ERD_Kiluan_Fase1.md` +
`KONTRAK_API_Kiluan_Fase1.md`. Ini gerbang test sebelum menulis brief Cursor & kode nyata
(FastAPI + SQLAlchemy + Alembic).

## Jalankan
```bash
pip install pytest pytest-asyncio
pytest -q
```

## Struktur
```
kiluan_f1/
  errors.py        amplop error kontrak (§1)
  ids.py           UUIDv7 monotonik (keyset)
  enums.py         enum F1 (§4) di level aplikasi
  models.py        dataclass domain (ERD §3)
  konteks.py       Aktor + RBAC (peran per-desa, kepemilikan)
  repositori.py    RepoMemori async + keyset pagination
  mesin_status.py  tabel state machine + guard (§6); arsip TANPA log (§9.5)
  kurasi.py        pencatatan kurasi_log append-only
  seed.py          bidang_usaha, aturan_poin, badge, kartu_aksi
  wiring.py        bangun_aplikasi(): rakit repo + service + seed
  layanan/
    pasar_desa.py    UMKM (verifikasi), Produk (publikasi butuh terverifikasi), Paket (SM+item)
    dapur_konten.py  Kontribusi (SM), award poin on setuju, kurasi_log
    lencana_warga.py Poin idempoten, Badge otomatis, Leaderboard
    naik_kelas.py    Pengajuan (SM) -> recompute Sertifikasi (tunas/bahari/lumba_lumba)
tests/               28 test; peta ke gerbang KONTRAK §10
```

## Peta test → gerbang kontrak (§10)
- **State machine & log:** `test_paket_transisi_*`, `test_transisi_ilegal_kontribusi`,
  `test_paket_arsip_tanpa_log` (arsip tak menulis `kurasi_log`).
- **Poin idempoten:** `test_setuju_dua_kali_poin_idempoten`, `test_produk_terdaftar_memberi_poin`.
- **Badge:** `test_badge_poin_min_ter_award`, `test_badge_aksi_jumlah_dan_tak_ganda`.
- **Verifikasi UMKM:** `test_umkm_belum_terverifikasi_gagal_publikasi`, `..._bisa_publikasi`.
- **Naik Kelas Lestari:** `test_validasi_menaikkan_skor_dan_tingkat`,
  `test_ranking_pasar_desa_urut_tingkat`, `test_kartu_sama_dihitung_sekali`.
- **Kepemilikan/RBAC:** `test_*_butuh_pengelola`, `test_verifikasi_butuh_pengelola`.
- **Isolasi tenant:** `test_umkm_lintas_tenant_404`, `test_paket_lintas_tenant_404`,
  `test_saldo_poin_terpisah_per_desa`.
- **paket_item & bukti:** `test_paket_item_wajib_referensi_atau_judul`,
  `test_bukti_tak_lengkap_ditolak`.
- **Paginasi keyset:** `test_keyset_stabil_saat_ditambah`.

## Sengaja belum dibuat (di luar domain murni)
Presigned MinIO, RRULE, HTTP/JSON, persistensi, RLS — semua di layer FastAPI/DB (brief Cursor).
Auto-apply kontribusi `koreksi_data`/`spot_baru` sengaja konservatif (KONTRAK §6.2/§9.6):
approval hanya mencatat + memberi poin, tidak memutasi `destinasi`.

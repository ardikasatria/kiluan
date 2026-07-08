# Scaffold F2 Kiluan — Python murni (async, tanpa DB)

Membuktikan invarian **Kontrak API F2** (`KONTRAK_API_Kiluan_Fase2.md` §11) sebagai
logika domain murni: repo in-memory async, tanpa FastAPI/SQLAlchemy. Ini gerbang
sebelum port ke SQLAlchemy 2.x + Alembic (brief Cursor berikutnya).

## Jalankan
```bash
cd kiluan_f2
pip install pytest pytest-asyncio --break-system-packages
python -m pytest -q     # 33 passed
```

## Struktur
```
kiluan_f2/
  clock.py            Jam terkendali + id monoton (emulasi UUIDv7 terurut)
  errors.py           Amplop galat + kode internal F2
  enums.py            Enum F2 + konstanta peran
  models.py           Entitas (dataclass), uang = Decimal
  repos.py            Repo in-memory async, filter desa_id, lock per-slot, toko idempotensi
  layanan_dermaga.py  checkout+hold, pembayaran manual/gateway, split escrow, webhook, booking
  layanan_uang.py     payout batch, refund (kebijakan escrow)
  layanan_poin.py     kupon (validasi/terapkan) + tukar poin
  layanan_penjelajah.py  misi→stempel+verifikasi, geofence (haversine), paspor
  layanan_pemandu.py  itinerary (hormati kuota), estimasi
  fabrik.py           factory + seed skenario Teluk Kiluan
tests/                33 uji memetakan gerbang §11
```

## Pemetaan gerbang §11 → uji
| Gerbang kontrak | Uji |
|---|---|
| Checkout konsisten + snapshot | `test_total_dan_snapshot` |
| Idempotensi checkout / key wajib | `test_idempotensi_checkout`, `test_idempotency_key_wajib` |
| Anti-overbook (race) | `test_anti_overbook_race` |
| Hold kedaluwarsa & batal lepas kuota | `test_hold_kedaluwarsa_lepas_kuota`, `test_batal_lepas_kuota` |
| Bayar hanya via webhook/konfirmasi-manual | `test_redirect_klien_tak_ubah_status`, `test_manual_hanya_bendahara_dan_bukan_pembeli` |
| Webhook signature + tepat-sekali | `test_webhook_signature_dan_tepat_sekali` |
| Split escrow invarian | `test_split_escrow_invarian` |
| Rilis → payout, anti-dobel, idempoten | `test_rilis_dan_payout`, `test_payout_idempoten` |
| Refund sebelum/ sesudah selesai | `test_refund_sebelum_payout`, `test_refund_setelah_selesai_ditolak` |
| Tukar poin (saldo/idempoten/tier) | `test_tukar_*` |
| Kupon (kedaluwarsa/min/penyedia/limit/unik) | `test_kupon_*`, `test_unik_kupon_pesanan` |
| Verifikasi (geofence/bukti/hanya terverifikasi) | `test_penjelajah.py` |
| Pemandu hormati kuota + sesi orang lain | `test_itinerary_hormati_kuota`, `test_sesi_orang_lain_404` |
| Isolasi tenant | `test_isolasi_tenant_pesanan`, `test_checkout_referensi_lintas_desa_404` |

## Penyederhanaan sadar (bukan utang tersembunyi)
- **Lock per-slot pakai `asyncio.Lock`** meng-emulasi `SELECT … FOR UPDATE`. Uji race
  memakai `asyncio.gather`; korektness dijamin lock, bukan kebetulan timing. Di Postgres,
  lock baris asli menggantikannya — pola sama, bukan refactor logika.
- **Diskon kupon tak dialokasikan ke split escrow.** `bruto` per penyedia = Σ subtotal item
  (pra-diskon); sumber pendanaan diskon (platform/kampanye) = keputusan tata kelola, ditunda.
  Uji split sengaja tanpa kupon agar invarian teruji bersih.
- **Idempotensi & webhook event** disimpan in-memory (set/dict). Di produksi → Redis
  (TTL) + tabel `webhook_pembayaran(event_id UNIQUE)`; kontraknya sudah sama.
- **Katalog (produk/paket) minimal** — hanya secukupnya untuk snapshot & resolusi penyedia;
  sumber sebenarnya modul F1.
- **Belum dibuat (sesuai batas F2 §12):** disbursement/refund gateway otomatis, LLM Pemandu,
  riwayat chat penuh, dan seluruh tabel F3 (`dana_konservasi`, `pemakaian_kapasitas`,
  `neraca_regeneratif`, `monitoring_ekologi`).

## Langkah berikut
Port ke `backend/` (SQLAlchemy 2.x async + Alembic) lewat **brief Cursor berpasangan
backend+frontend** — logika service ini jadi acuan perilaku, uji ini jadi kontacuan regresi.

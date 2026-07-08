# ADR-0003 — Async end-to-end (FastAPI + SQLAlchemy) vs service sinkron

**Status:** Diterima (F0). Dapat ditinjau ulang bila tim menemui friksi async (lihat "Pemicu tinjau ulang").
**Konteks pengambil keputusan:** Satria (technical lead) + co-architect.
**Terkait:** scaffold `backend/app` (service ditulis **sinkron**), Blueprint §2 (stack "FastAPI async").

## Konteks

Scaffold Fase 0 menulis service (`app/layanan/*`) secara **sinkron** dengan repo in-memory, agar `pytest` hijau tanpa DB. Saat mewujudkan ke stack nyata, ada percabangan yang memengaruhi seluruh backend:

- **(A) Async end-to-end** — repo SQLAlchemy `async`, service `async`, endpoint FastAPI `async`.
- **(B) Sinkron** — repo SQLAlchemy sinkron, service **tak berubah**, endpoint FastAPI sinkron (dijalankan FastAPI di threadpool).

Nilai jual scaffold adalah "logika teruji tak tersentuh". Opsi B memaksimalkan itu (service & unit test tetap apa adanya). Opsi A menyentuh tiap method service (menambah `async/await`) dan unit test (butuh `pytest-asyncio`), tetapi menyelaraskan dengan blueprint dan lebih baik untuk beban I/O-bound.

## Keputusan

**Diambil: (A) Async end-to-end.**

Alasan:
1. **Blueprint mengunci FastAPI async**; belum ada keputusan Satria untuk override, jadi blueprint menang.
2. **Concurrency di hosting terbatas.** Teluk Kiluan bersinyal minim; banyak operasi I/O lambat (upload MinIO, sinkron PWA tertunda yang datang berbondong, webhook pembayaran F2). Async memungkinkan satu worker melayani banyak permintaan lambat tanpa menambah proses — relevan untuk deployment hemat.
3. **Future-proof F2+.** Webhook gateway, disbursement, streaming media, dan RAG Pemandu semuanya I/O-bound; memulai sinkron lalu pindah async belakangan justru lebih mahal.
4. **Biaya porting terbatas & mekanis.** Yang berubah hanya *plumbing* (service jadi `async`, repo `await`), **bukan logika**. Domain murni (`rbac`, `geo`, `keamanan`, `paginasi`, state machine) **tak berubah sama sekali**.

## Konsekuensi

- **`app/domain/**` dan `app/skema/**` tetap 100% seperti scaffold** (tak ada I/O di dalamnya).
- **`app/layanan/**`** diporting mekanis: `def` → `async def`, panggilan repo diberi `await`. Tak ada perubahan aturan bisnis.
- **`app/repo/memori.py`** dibuat async juga (method `async def`, `await`-able) agar unit test tetap memakainya sebagai test double yang setia. Unit test memakai `pytest-asyncio` (`@pytest.mark.asyncio`).
- **`app/repo/sql.py`** memakai `AsyncSession` (SQLAlchemy 2.0) + `asyncpg`.
- **Migrasi tetap sinkron.** Alembic dijalankan dengan engine **sinkron** (`psycopg`), terpisah dari runtime app async — pola standar, menghindari kompleksitas alembic-async. Karena itu ada dua URL: `DATABASE_URL` (asyncpg, app) & `DATABASE_URL_SYNC` (psycopg, alembic).

### Resep porting (dilakukan di B1, sekali)
```
# service: tiap method
- def buat(self, ...):            →  async def buat(self, ...):
-   d = self.store.destinasi.tambah(x)  →    d = await self.store.destinasi.tambah(x)

# repo/memori.py: method jadi async (tetap in-memory, hanya tanda tangan async)
- def tambah(self, x): ...        →  async def tambah(self, x): ...

# test: 
+ import pytest
+ @pytest.mark.asyncio
- def test_x(...):                →  async def test_x(...):
-   svc.buat(...)                 →    await svc.buat(...)
```
Konversi ini regex-able; tidak menyentuh assertion maupun logika.

## Alternatif yang tidak diambil

**(B) Service sinkron + FastAPI sinkron (threadpool).** *Menarik* karena churn nol — service & test scaffold dipakai verbatim, dan untuk skala desa beban rendah performanya cukup. **Ditolak** karena menyimpang dari blueprint, membatasi concurrency saat operasi I/O menumpuk, dan menunda biaya migrasi async ke fase yang lebih berisiko (F2 pembayaran). Tetap dicatat sebagai fallback.

## Pemicu tinjau ulang

Beralih ke (B) dipertimbangkan bila: tim kehilangan waktu signifikan pada bug spesifik-async (session/greenlet), ATAU profiling menunjukkan async tak memberi manfaat nyata pada beban aktual. Biaya balik ≈ sedang (service + test), bukan rewrite — karena domain tak pernah bergantung pada model konkurensi.

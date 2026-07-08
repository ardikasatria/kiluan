# Brief Cursor — B3/F3: Etalase & Discovery + Halaman Spot (Gerbang)

**Prasyarat:** B0–B2 hijau (destinasi + geo + repo SQL destinasi ada). Stack async.
**Rujukan:** `KONTRAK_API §4 & §7`, repo `backend/` pasca-B2. **Pola:** `discovery.py` (service sudah async & teruji), `sql.py`, `api/deps.py`.

## Langkah 0 — Orientasi repo (WAJIB)
Baca `KONTRAK_API §4` (discovery) & `§7` (DTO ringkas/detail). Konfirmasi repo destinasi SQL + PostGIS dari B2 tersedia. `pytest -q` hijau. **Jangan** ubah `domain/**`, `skema/**`. Ringkas file yang disentuh + risiko.

---

## B3 backend — Discovery publik

Service `DiscoveryLayanan` sudah async & teruji. Yang kurang: repo query lintas-desa + router + perakitan DTO detail.

1. **Endpoint (Kontrak §4), semua publik:**
   - `GET /discovery/desa` — daftar `desa.status=aktif` (opsi `dekat`,`q`,keyset). Disiapkan multi-desa (F4); F0 praktis satu desa.
   - `GET /discovery/destinasi` — agregasi destinasi `publikasi` lintas desa `aktif` (param `desa?`,`kategori`,`q`,keyset).
   - `GET /desa/{slug}` — profil desa publik (bila belum dibuat di B2).
   - `GET /desa/{slug}/destinasi` & `.../{id|slug}` — bila belum lengkap di B2, tuntaskan di sini.
2. **DTO detail terakit** (`§7`): satu payload detail destinasi = destinasi + `kategori` + `tag[]` + `layanan[]` (publikasi) + `kalender[]` (aktif) + `media[]` (urut, `utama`). **Media join penuh bergantung B4** — sampai itu, kembalikan `media: []` (degrade mulus), sisanya lengkap sekarang.
3. **Repo:** query publik terfilter `status=publikasi` & `dihapus_pada IS NULL`; discovery hanya `desa aktif`. Keyset UUIDv7. Tag/layanan/kalender di-load per destinasi (hindari N+1: batch/selectin).
4. **Gerbang:** unit lama hijau; publik tak melihat draft/soft-deleted; discovery hanya desa aktif; keyset stabil; detail resolusi slug dalam scope desa (lintas → 404); smoke.

---

## F3 frontend — Permukaan publik (Next.js App Router, PWA)

Langkah 0 dulu. Lalu (SSR/ISR untuk SEO konten publik):
- `/` — **discovery multi-desa**: peta + daftar, filter (kategori/tag), pencarian, keyset "muat lebih banyak".
- `/[desa]` — etalase desa (profil + destinasi publikasi + widget Cuaca dari F2).
- `/[desa]/spot/[id]` — **detail spot**: galeri (media, placeholder sampai B4), peta lokasi, layanan terkait, kalender aktivitas, kartu Cuaca/keselamatan (label **"Sumber: BMKG"**).
- Aksesibilitas + performa layak; keyset pagination; offline-first shell.
- **Gerbang:** halaman publik hanya konten publikasi; radius/geo query benar; detail memuat relasi; SEO (meta/OG) terisi.

---

## Guardrails
- Publik = hanya `publikasi` + `desa aktif` + bukan soft-deleted; **lintas-tenant → 404**.
- Hindari N+1 saat merakit detail (batch load relasi).
- Tak sentuh `domain/**`/`skema/**`; perubahan skema (jika ada) via Alembic increment.
- Media di detail menyusul B4 — jangan blokir B3 karenanya (kembalikan `media: []`).

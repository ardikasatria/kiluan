# ADR-0011 — Alokasi diskon kupon terhadap split escrow

**Status:** Diterima (F2). Keputusan #1 pada brief F2.
**Terkait:** ADR-0010, `KONTRAK_API_Kiluan_Fase2.md` §5, ERD `transaksi`/`kupon`.

## Konteks

`pesanan.total = subtotal − diskon + ongkir`. Split escrow dihitung per penyedia atas `bruto`. Tanpa aturan, diskon kampanye bisa membuat `Σ bruto > total` masuk escrow.

## Keputusan

**(A) Diskon mengurangi `bruto` penyedia (self-funding), diarahkan lewat `penyedia_terbatas` + opt-in.**

1. Alokasi proporsional diskon ke item eligible.
2. `bruto_i = subtotal_i − diskon_i`; split dihitung pasca-diskon.
3. Kupon kampanye/tukar poin hanya menyasar penyedia opt-in (`penyedia_terbatas`).
4. Invarian CHECK tetap: `Σ bruto = total` setelah diskon.

## Konsekuensi

- Implementasi checkout + `_settle` memakai bruto pasca-diskon (B11 partial pada alokasi kampanye lintas-penyedia — thin slice PkM bisa menunda kupon kampanye penuh).
- Subsidi dana kampanye desa (model B) ditunda F3.

## Alternatif yang tidak diambil

- (B) Dana kampanye desa mendanai diskon — butuh `dana_kampanye` (F3).
- (C) Platform menanggung — ditolak (positioning non-OTA).
- Diskon memotong penyedia tanpa opt-in — ditolak (inklusivitas).

## Pemicu tinjau ulang

F3 `dana_kampanye` tersedia dan Pokdarwis ingin diskon lintas-penyedia tanpa membebani vendor.

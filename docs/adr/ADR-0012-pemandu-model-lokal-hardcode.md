# ADR-0012 — Pemandu: model terlatih lokal, konfig hardcode (bukan OpenAI)

**Status:** Diterima (F2).
**Konteks pengambil keputusan:** Satria (technical lead).
**Terkait:** `app/inti/pemandu/`, brief B13/F13, `sesi_pemandu.model_dipakai`.

## Konteks

Pemandu wisata butuh itinerary/chat. Opsi: API pihak ketiga (OpenAI), model terlatih sendiri di infrastruktur Kiluan, atau rule-based. Kebijakan produk: **kedaulatan data**, kendali biaya, dan **tanpa GUI manajemen model** — switch model hanya lewat deploy backend.

## Keputusan

1. **Antarmuka `MesinPemandu`** dengan dua implementasi:
   - `MesinAturan` — default PkM (deterministik, data lokal, hormati kuota slot).
   - `MesinLokal` — model terlatih sendiri via **HTTP inference internal** (vLLM/TGI/FastAPI custom), **bukan** OpenAI atau API cloud generik.
2. **Registry hardcode** di `app/inti/pemandu/konfig.py`:
   - `MESIN_AKTIF = "rule" | "lokal"`
   - `MODEL_LOKAL` (URL, `model_id`, path checkpoint, timeout).
3. **PkM:** `MESIN_AKTIF = "rule"`, `MODEL_LOKAL["aktif"] = False`.
4. Kolom DB `model_dipakai`: `'rule'` | `'llm'` — nilai `'llm'` = mesin non-rule (model lokal), **bukan** semantik OpenAI.
5. Fallback ke rule jika inference lokal gagal.

## Konsekuensi

- Tim ML deploy checkpoint + server inference; ubah `konfig.py` + restart — tanpa panel admin.
- Tidak ada dependency OpenAI di jalur produksi PkM.
- Riwayat chat penuh + fine-tuning loop → Fase 4–5 (di belakang gate biaya).

## Alternatif yang tidak diambil

- OpenAI/Anthropic API langsung — ditolak (kedaulatan data + biaya).
- GUI manajemen model di dashboard — ditolak (scope PkM; hardcode cukup).
- LLM aktif default — ditolak (thin-slice rule-first).

## Pemicu tinjau ulang

Model v1 siap di-production (`MODEL_LOKAL["aktif"] = True`), atau kebutuhan multi-model per desa (F4+).

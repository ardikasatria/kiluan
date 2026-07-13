# Brief Cursor — B/F-Cuaca: Prakiraan Cuaca Lampung (Kabupaten + Kecamatan)

**Platform:** **Sigerciv** — pariwisata regeneratif desa-desa Lampung. *(Increment; memperluas integrasi BMKG B2 dari satu titik Teluk Kiluan → seluruh Lampung.)*
**Cakupan:** prakiraan cuaca **BMKG** untuk **semua kabupaten Lampung** (kartu landing = level kabupaten) + **laman detail per kecamatan**; fail-soft + atribusi BMKG wajib.
**Mode:** **Next.js web murni (belum PWA)**; SSR/ISR untuk laman cuaca (SEO). i18n: pakai `weather_desc` (ID) / `weather_desc_en` (EN) dari BMKG.
**Prasyarat:** F0 BMKG adapter (B2) ada; Redis cache; jaringan boleh akses `api.bmkg.go.id` & `peta-maritim.bmkg.go.id`.
**Rujukan:** BMKG API `GET /publik/prakiraan-cuaca?adm{1..4}={kode}` (adm1 provinsi=`18` Lampung, adm2 kabupaten, adm3 kecamatan, adm4 desa=terendah); kode wilayah **Permendagri 72/2019**. `KONTRAK_API_Fase0 §4 (discovery, fail-soft, atribusi)`, brief B2/F-Landing.

---

## Langkah 0 — Orientasi repo (WAJIB)

Baca `backend/`: **adapter BMKG B2** (parsing + cache Redis + fail-soft yang sudah ada — perluas, jangan tulis ulang), pola cache/TTL, Alembic. Baca `frontend/`: kartu cuaca landing lama (Teluk Kiluan), i18n, format tanggal. Ringkas file disentuh + risiko.

---

## Rancang (kunci sebelum kode)

### Tabel referensi `wilayah_lampung` (increment `000Y_wilayah`)
- `id` · `tingkat` `CHECK (tingkat IN ('kabupaten','kecamatan'))` · `nama` · `kode_wilayah` (Permendagri, mis. `18.71` / `18.71.03`) · `kode_bmkg` (adm4 **wakil** untuk fetch, karena level terendah BMKG = adm4) · `parent_id` FK self (kecamatan→kabupaten) NULL · `lat`/`lng` NULL · `aktif`.
- **Seed** dari Permendagri 72/2019 untuk provinsi **18** (±15 kabupaten/kota, ±225 kecamatan). Desa (adm4) **tak** perlu disimpan semua; cukup satu `kode_bmkg` wakil per wilayah (ibukota kab / pusat kecamatan).

> **Tradeoff (jujur):** "cuaca kabupaten" pada kartu = **titik wakil** (BMKG terendah adm4), bukan agregat seluruh kecamatan. Alternatif agregasi semua kecamatan lebih berat & lambat. Rekomendasi: **titik wakil** untuk kartu; laman detail menampilkan kecamatan **sebenarnya**.

### Kontrak API (perluasan adapter B2)
- `GET /cuaca/kabupaten` — daftar kabupaten Lampung + ringkas cuaca kini (wakil). 
- `GET /cuaca/kabupaten/{kode}` — ringkas kabupaten + daftar kecamatan-nya.
- `GET /cuaca/kecamatan/{kode}` — prakiraan **3-harian** detail.
- (Opsional coastal) `GET /cuaca/perairan/{kode}` — bahari via `peta-maritim`.
- Respons **wajib** sertakan `atribusi: "Sumber: BMKG"`, `diperbarui_pada`, dan `tersedia: bool`. Cache Redis `cuaca:{kode}` **TTL ~3 jam**; **fail-soft**: BMKG gagal → kembalikan cache terakhir, atau `200 {tersedia:false, diperbarui_pada}` — **jangan** 5xx ke klien.

### Gerbang pytest (BMKG di-mock)
Parse respons BMKG (t, weather_desc, weather_desc_en, ws, hu, dst.); cache hit/miss; **fail-soft** (BMKG error/timeout → cache/degraded, tak pernah 5xx); atribusi selalu ada; seed wilayah Lampung benar (kabupaten+kecamatan, parent); endpoint kabupaten vs kecamatan.

---

## Scaffold + pytest (WAJIB sebelum frontend)

Perluas adapter BMKG (fetch per `kode_bmkg`, TTL, fail-soft) + `layanan/cuaca.py` + seed `wilayah_lampung` → hijaukan gerbang. Frontend tak konsumsi sebelum hijau.

---

## Frontend

**Kartu landing (level KABUPATEN saja):** ringkas cuaca kini untuk satu kabupaten — default kabupaten dari desa yang sedang ditonjolkan / lokasi pengguna, dengan **pemilih kabupaten** (daftar kabupaten Lampung). Tampilkan ikon+suhu+deskripsi (`weather_desc`/`weather_desc_en` per locale), **atribusi "Sumber: BMKG"** wajib, `diperbarui_pada`. **Fail-soft:** `tersedia:false` → tampil "prakiraan sementara tak tersedia", halaman tetap jalan. Tautan **"Lihat detail per kecamatan"** → laman detail.

**Laman detail `/cuaca` (+ `/cuaca/[kabupaten]`):** SSR/ISR. Pilih kabupaten → daftar **kecamatan** + prakiraan **3-harian** (per jam/segmen) tiap kecamatan; opsi **cuaca perairan** untuk kabupaten pesisir (bahari). Atribusi BMKG di tiap blok. Meta/OG per kabupaten (SEO).

---

## Gerbang (uji frontend — web)

- **Kartu = kabupaten:** hanya level kabupaten di landing; pemilih kabupaten Lampung jalan; **atribusi BMKG** tampil; `diperbarui_pada` tampil.
- **Fail-soft:** `tersedia:false` → pesan degradasi, tak merusak landing.
- **Detail kecamatan:** drill kabupaten→kecamatan; 3-harian render; coastal → blok perairan; SSR + meta.
- **i18n:** `weather_desc_en` dipakai di EN; tanggal per locale; **a11y** ikon+teks (bukan ikon saja).

---

## Batas

Cuaca level desa (adm4 penuh) → tak perlu untuk kartu/detail (kecamatan cukup). Cache offline cuaca → fase PWA. Peringatan dini/nowcasting BMKG lanjutan → roadmap. Integrasi ke **Pengumuman Kondisi bahari** (mengisi otomatis sumber) → opsional, di brief B/F-Kondisi tetap manusia-tulis sebagai otoritas.

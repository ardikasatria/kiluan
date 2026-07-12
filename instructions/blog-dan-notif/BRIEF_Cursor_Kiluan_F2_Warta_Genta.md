# Brief Cursor — Addendum F2: Warta (B14/F14) + Genta (B15/F15)

**Untuk:** agen Cursor (backend + frontend berpasangan). Tambahan atas `BRIEF_Cursor_Kiluan_Fase2.md`.
**Prasyarat:** B9–B13 F2 (Dermaga/escrow/kupon/Penjelajah/Pemandu) sudah jalan; migrasi terakhir `0003_f2`.
**Rujukan wajib (`docs/`):** `ADDENDUM_F2_Warta_Genta.md` (ERD+kontrak modul ini), `KONTRAK_API_Kiluan_Fase2.md`, `ERD_Kiluan_Fase2.md`, ADR-05.
**Prinsip:** blueprint-first, tenant `desa_id` di **semua** query, enum di aplikasi + `CHECK`, soft delete pada konten, lintas-tenant→404, snake_case Bahasa Indonesia, **tak ada perubahan skema tanpa Alembic**. **Baru:** notifikasi = **system-authoritative** (lahir dari outbox, klien tak pernah menulis inbox).

> **Cara pakai.** **B14/F14 (Warta) mandiri** — boleh kapan saja setelah `0003_f2`. **B15/F15 (Genta) setelah B9/B10/B12** (butuh titik emit). Backend/frontend satu nomor boleh paralel (frontend pakai mock kontrak sampai backend siap). Tiap pasangan **WAJIB** dibuka **Langkah 0**.
> **Guardrail PkM:** Warta = CRUD murah, aman untuk PkM. Genta **in-app** = bernilai, biaya sedang (outbox+dispatcher). **Email/push/WA fan-out ditunda** (Resend domain belum terverifikasi; WA Business API berbiaya) — jangan over-promise.

---

## Langkah 0 — Orientasi repo (tempel di awal SETIAP brief)

1. Baca `docs/ADDENDUM_F2_Warta_Genta.md` (bagian modul yang disentuh) + endpoint/ERD terkait.
2. Petakan repo: `backend/app/{domain,skema,layanan,repo,model,api,inti}`, `frontend/app`, `infra/`. Catat file **disentuh** vs **rujukan**. Acuan pola: `app/repo/sql.py`, `app/api/deps.py` (`resolusi_desa`/`wajib_peran`/`kepemilikan`), `app/inti/*`.
3. Konvensi wajib: filter `desa_id`; amplop error `{"galat":{...}}`; lintas-tenant→404; publik hanya entitas layak-tayang & `dihapus_pada IS NULL`; keyset `?batas=&kursor=`; kepemilikan.
4. `cd backend && pytest -q` **hijau** sebelum & sesudah. Jangan pecahkan uji F0–F2.
5. **Jangan** ubah `app/domain/**` & `app/skema/**` F0–F2 kecuali brief memerintah eksplisit. Pengecualian tunggal: **B15** menambah `await outbox.emit(...)` di service B9/B10/B12 (aditif, in-TX — bukan perubahan logika uang).
6. Perubahan skema = **migrasi Alembic increment** (`0004_warta_genta`), bukan `create_all`, bukan sunting `0003_f2`. Uji `upgrade head`→`downgrade` ke `0003_f2` bersih.

Keluaran Langkah 0: ringkasan 5–10 baris (file dibuat/diubah + risiko) sebelum ngoding.

---

## Pasangan B14/F14 — Warta (Berita/Blog admin)

**Tujuan.** Manajemen blog/berita per desa: pengumuman, cerita, update konservasi, rekap acara. Pengelola menulis; publik membaca. Penjadwalan tayang tanpa job.

### B14 (backend)
Langkah 0, lalu:
- **Migrasi `0004_warta_genta`** (increment) — buat `berita`, `berita_tag`, `peristiwa`, `notifikasi` (Genta ikut di migrasi yang sama agar satu unit addendum) + ALTER `media_lampiran.entitas_tipe` memuat `'berita'`. `CHECK` enum sesuai addendum §A. Uji `upgrade`→`downgrade` ke `0003_f2` bersih.
- **`repo/sql.py`** +`RepoBerita` (+ jembatan `berita_tag`). Filter publik `status='publikasi' AND (terbit_pada IS NULL OR terbit_pada<=now()) AND dihapus_pada IS NULL`.
- **`layanan/warta.py`** + **`api/berita.py`** (kontrak §B.1): `GET /berita` (filter kategori/tag/sorotan/status), `GET /berita/{id|slug}`, `POST` (pengelola→`draft`), `PATCH`, `PATCH /status` (`draft↔publikasi↔arsip` + set `terbit_pada`), `DELETE` (soft), `POST/DELETE .../tag`.
- **Aturan:** `UNIQUE(desa_id, slug)`→`409 konflik`; publikasi/status hanya `pokdarwis|perangkat_desa|admin`; `PATCH`/`DELETE` oleh penulis atau pengelola (kepemilikan); sampul via `sampul_media_id` (media F0), galeri via `media_lampiran(entitas_tipe='berita')`.
- **Tes:** unit `test_warta` (memori) + integrasi Postgres: slug unik; artikel `terbit_pada` masa depan tak tampil publik tapi tampil bagi pengelola; soft delete hilang; non-pengelola tak bisa publikasi; isolasi tenant.

### F14 (frontend)
Langkah 0, lalu:
- **Publik:** `/[desa]/berita` (daftar + filter kategori/tag, kartu sorotan di atas) & `/[desa]/berita/[slug]` (render markdown, sampul, tag, penulis, tanggal).
- **Dashboard pengelola:** editor artikel (markdown, unggah sampul presigned MinIO F0, pilih kategori/tag, toggle sorotan, atur `terbit_pada`), daftar kelola (draft/publikasi/arsip), transisi status, arsip/hapus.
- **Offline-first:** artikel yang sudah dibuka dapat dibaca offline (cache); tulis/edit online-only.
- **Gerbang:** artikel terjadwal tak muncul publik sebelum `terbit_pada`; hanya pengelola melihat menu tulis; slug bentrok memberi pesan jelas.

**Batas:** komentar/reaksi pembaca di luar F2. RSS/SEO lanjutan → F4.

---

## Pasangan B15/F15 — Genta (Notifikasi aktivitas transaksi)

**Tujuan.** Beritahu aktivitas transaksi ke pihak tepat lewat **outbox transaksional** + dispatcher fan-out. In-app dulu; email untuk subset bila Resend siap.

### B15 (backend)
Langkah 0, lalu:
- **`repo/sql.py`** +`RepoPeristiwa/Notifikasi` (tabel sudah dibuat di `0004`). `peristiwa` append-only; `notifikasi` fan-out ber-`UNIQUE(peristiwa_id,penerima_id,tipe)`.
- **Outbox helper (`app/inti/outbox.py`):** `emit(jenis, entitas_tipe, entitas_id, muatan)` menulis `peristiwa` memakai **session/TX yang sedang berjalan** (bukan koneksi baru) → atomic dengan perubahan status.
- **Sisipkan `await outbox.emit(...)`** di titik emit addendum §B.2 pada service **B9/B10/B12** (`_settle`, `buat_pembayaran` manual, `checkin`, `selesaikan_pesanan`, `buat_payout`, `transisi_payout`, `ajukan_refund`, `transisi_refund`, `tukar`, `selesaikan_misi`/`putuskan_verifikasi`). **Aditif & in-TX** — jangan ubah logika uang; uji uang B9–B12 harus tetap hijau.
- **Dispatcher (`app/inti/pengirim_notifikasi.py`):** job polling `peristiwa WHERE diproses_pada IS NULL` (interval mirip `sapu_kedaluwarsa`); untuk tiap event, resolve penerima dari peta §B.2 (peta di **kode**, bukan tabel), tulis `notifikasi` per penerima (`ON CONFLICT (peristiwa_id,penerima_id,tipe) DO NOTHING` → idempoten), lalu set `diproses_pada`. Bila kanal `email✔` & Resend aktif → panggil adapter email F0 (di-gate; default mati).
- **`api/notifikasi.py`** (kontrak §B.1): `GET /notifikasi` (inbox diri, keyset), `GET /notifikasi/hitung` (belum dibaca), `POST /{id}/baca`, `POST /baca-semua`. **Tak ada** endpoint create. `baca` hanya oleh pemilik.
- **Tes:** unit `test_genta` + integrasi: `_settle` menulis **satu** `peristiwa` dalam TX yang sama (rollback pesanan → tak ada peristiwa yatim); dispatcher fan-out ke penerima benar; jalan dua kali **tak** menggandakan; klien tak bisa membuat notifikasi; `hitung`/`baca`/`baca-semua` benar; user hanya inbox sendiri (desa lain→404).

### F15 (frontend)
Langkah 0, lalu:
- **Lonceng header:** ikon + badge belum-dibaca (poll `GET /notifikasi/hitung`, interval hemat; dedup saat tab tak aktif). Dropdown daftar terbaru → klik = tandai dibaca + deep-link ke `entitas` (pesanan/booking/payout/paspor).
- **Halaman notifikasi** `/[desa]/notifikasi`: daftar keyset, filter belum/sudah dibaca, "tandai semua dibaca".
- **Peran-aware:** pembeli lihat notif pesanan/booking/refund miliknya; penyedia lihat pesanan-masuk/rilis/payout; bendahara/pokdarwis lihat pembayaran-menunggu/refund-diajukan.
- **Offline-first:** notif ter-cache terbaca offline; aksi `baca` antre sinkron.
- **Gerbang:** badge akurat vs unread; klik menandai dibaca & membuka entitas benar; user tak melihat notif orang lain.

**Batas (Tahun 4–5 / F3–F4):** `preferensi_notifikasi` (toggle kanal per jenis), push PWA (service worker), WhatsApp Business API, dan digest email — semua ditunda. Outbox `peristiwa` ini menjadi sumber event **F3** (neraca/analitik) → tak dibongkar ulang.

---

## Penutup addendum
1. Kerjakan **B14/F14 kapan saja** (mandiri); **B15/F15 setelah B9/B10/B12**.
2. Hijaukan gerbang addendum §B.4 (unit memori + integrasi Postgres) sebelum tutup; pastikan **uji uang B9–B12 tetap hijau** setelah sisipan emit.
3. Catat sebagai **ADR pendek** bila perlu: outbox transaksional dibawa maju ke F2 (dipakai ulang F3), penjadwalan Warta read-time tanpa job, notifikasi system-authoritative.
4. **Menuju F3:** konsumer analitik/neraca membaca `peristiwa` yang sama (medallion bronze); tambah `preferensi_notifikasi` + kanal push/WA di F4 tanpa mengubah emitter.

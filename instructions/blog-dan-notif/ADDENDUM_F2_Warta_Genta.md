# Addendum Fase 2 — Warta (Berita/Blog) + Genta (Notifikasi)

**Sifat:** tambahan modul F2 di atas `ERD_Kiluan_Fase2.md` + `KONTRAK_API_Kiluan_Fase2.md`. Tak mengubah modul F2 yang sudah dikunci; hanya menambah tabel + endpoint.
**Konteks pengambil keputusan:** Satria (technical lead) + co-architect.
**Terkait:** ADR-05 (kontrak F2), ADR-02 (escrow), ADR-0003 (async). **Mewarisi** seluruh konvensi F0 §1 (tenant `desa_id`, keyset, amplop error, soft delete, lintas-tenant→404) & prinsip F2 (status transaksi **bukan** verba klien).
**Peta modul (usul):**

| Fungsional | Nama tematik | Fase |
|---|---|---|
| Berita & Blog (dikelola admin) | **Warta** | F2 |
| Notifikasi aktivitas transaksi | **Genta** | F2 (fondasi outbox dipakai ulang F3) |

**Keputusan arsitektur kunci (Genta):** notifikasi dibangun di atas **outbox transaksional `peristiwa`** — service menulis event ke `peristiwa` **dalam transaksi DB yang sama** dengan perubahan status uang/booking; **dispatcher** terpisah mem-fan-out ke `notifikasi` per penerima. Ini menjamin **tepat-sekali** (tak ada notif hilang saat commit sukses tapi kirim gagal, tak ada ganda saat dispatcher retry). Menyelipkan `kirim_notif()` di tengah service **ditolak** (rapuh, menggandakan pada retry, mencampur I/O ke domain). Outbox ini juga menjadi sumber event F3 (neraca/analitik) → bukan kerja terbuang.

---

## Bagian A — ERD

### A.1 Warta (Berita/Blog)

**`berita`** (konten, soft-delete, per-tenant)
- `id` uuid PK (UUIDv7)
- `desa_id` uuid → `desa` (tenant, **wajib** di tiap query)
- `penulis_id` uuid → `pengguna`
- `slug` text — `UNIQUE(desa_id, slug)`
- `judul` text
- `ringkasan` text nullable
- `konten` text (markdown)
- `sampul_media_id` uuid → `media` nullable
- `kategori` text `CHECK ∈ {pengumuman, cerita, konservasi, acara, panduan, lainnya}`
- `status` text `CHECK ∈ {draft, publikasi, arsip}` default `draft`
- `terbit_pada` timestamptz nullable — jadwal tayang; publik hanya bila `status='publikasi' AND (terbit_pada IS NULL OR terbit_pada <= now())`
- `sorotan` boolean default `false` (featured)
- `dibuat_pada`, `diperbarui_pada`, `dihapus_pada` (nullable, soft delete)
- Indeks: `UNIQUE(desa_id, slug)`; `(desa_id, status, terbit_pada DESC)`; `(desa_id, sorotan) WHERE dihapus_pada IS NULL`

**`berita_tag`** (jembatan, reuse `tag` global F0)
- `berita_id` uuid → `berita`, `tag_id` smallint → `tag`; PK `(berita_id, tag_id)`

**ALTER** `media_lampiran.entitas_tipe` — perluas `CHECK` agar memuat `'berita'` (galeri/inline gambar; pola sama F0/F1).

> **Penjadwalan tanpa job.** Tak ada status `terjadwal`; artikel masa depan = `status='publikasi'` + `terbit_pada` di masa depan → tersaring otomatis di **read-time**. Menghindari job scheduler (guardrail PkM). Tradeoff: tak ada notifikasi "artikel tayang" otomatis kecuali lewat Genta (opsional).

### A.2 Genta (Notifikasi + Outbox)

**`peristiwa`** (transactional outbox — append-only)
- `id` uuid PK
- `desa_id` uuid
- `jenis` text — kode event (lihat B.2), `CHECK` daftar tertutup
- `entitas_tipe` text, `entitas_id` uuid — sumber event
- `muatan` jsonb — snapshot data untuk fan-out (mis. `pembeli_id`, daftar penyedia, `jumlah`) agar dispatcher tak perlu query balik yang rapuh
- `dibuat_pada` timestamptz
- `diproses_pada` timestamptz nullable
- Indeks: `(diproses_pada) WHERE diproses_pada IS NULL` (partial — polling dispatcher murah); `(desa_id, entitas_tipe, entitas_id)`

**`notifikasi`** (inbox per-penerima)
- `id` uuid PK
- `desa_id` uuid
- `penerima_id` uuid → `pengguna`
- `peristiwa_id` uuid → `peristiwa` nullable (provenance)
- `tipe` text — kode event
- `judul` text, `isi` text
- `entitas_tipe` text, `entitas_id` uuid — target deep-link (mis. buka pesanan)
- `kanal` text `CHECK ∈ {in_app, email}` default `in_app`
- `status` text `CHECK ∈ {belum_dibaca, dibaca}` default `belum_dibaca`
- `dibuat_pada`, `dibaca_pada` nullable
- Indeks: `(desa_id, penerima_id, status, dibuat_pada DESC)`; **`UNIQUE(peristiwa_id, penerima_id, tipe)`** — idempotensi fan-out (dispatcher retry tak menggandakan)

> **Ditunda (catatan):** `preferensi_notifikasi` (toggle kanal per jenis event per pengguna) → F3/F4. Di F2 default: semua event transaksi → `in_app`; `email` hanya untuk subset (lihat B.2) dan **hanya bila** domain Resend terverifikasi (blocker email F0 yang sudah dikenal).

---

## Bagian B — Kontrak API

### B.1 Ringkasan endpoint

**Warta · `/desa/{slug}`**
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| GET | `/desa/{slug}/berita` | Daftar `?kategori=&status=&tag=&sorotan=&batas=&kursor=` | publik* |
| GET | `/desa/{slug}/berita/{id\|slug}` | Detail artikel | publik* |
| POST | `/desa/{slug}/berita` | Buat (`draft`) | pokdarwis/perangkat/admin |
| PATCH | `/desa/{slug}/berita/{id}` | Ubah | penulis/pengelola |
| PATCH | `/desa/{slug}/berita/{id}/status` | `draft↔publikasi↔arsip` (+`terbit_pada`) | pokdarwis/perangkat/admin |
| DELETE | `/desa/{slug}/berita/{id}` | Soft delete | penulis/pengelola |
| POST | `/desa/{slug}/berita/{id}/tag` | Tempel tag | penulis/pengelola |
| DELETE | `/desa/{slug}/berita/{id}/tag/{tag_id}` | Lepas tag | penulis/pengelola |

**Genta · `/desa/{slug}`**
| Metode | Path | Ringkas | Auth |
|---|---|---|---|
| GET | `/desa/{slug}/notifikasi` | Inbox diri `?status=&batas=&kursor=` | user |
| GET | `/desa/{slug}/notifikasi/hitung` | Jumlah belum dibaca (badge lonceng) | user |
| POST | `/desa/{slug}/notifikasi/{id}/baca` | Tandai dibaca | pemilik |
| POST | `/desa/{slug}/notifikasi/baca-semua` | Tandai semua dibaca | user |

\* *publik hanya `status='publikasi' AND (terbit_pada IS NULL OR terbit_pada<=now)' AND dihapus_pada IS NULL`; pengelola melihat semua status.*

> **Tak ada endpoint membuat notifikasi.** Konsisten prinsip F2 (aktivitas transaksi = system-authoritative): notifikasi **hanya** lahir dari outbox `peristiwa` yang ditulis service. Klien tak pernah menulis inbox orang lain.

### B.2 Katalog event → penerima (dipakai dispatcher)

Service menulis `peristiwa` di titik-titik ini (dalam TX yang sama); dispatcher me-resolve penerima:

| `jenis` event | Titik emit (service) | Penerima |
|---|---|---|
| `pembayaran_menunggu_konfirmasi` | `buat_pembayaran` (manual) | bendahara/pokdarwis (email✔) |
| `pembayaran_berhasil` | `_settle` (webhook/konfirmasi-manual) | pembeli (email✔) |
| `pesanan_dibayar` | `_settle` | penyedia terkait |
| `booking_terkonfirmasi` | `_settle` | pembeli |
| `booking_checkin` | `checkin` | penyedia |
| `pesanan_selesai` | `selesaikan_pesanan` | pembeli + penyedia |
| `transaksi_dirilis` | `selesaikan_pesanan` | penyedia |
| `payout_dibuat` | `buat_payout` | penyedia |
| `payout_berhasil` | `transisi_payout(tandai_berhasil)` | penyedia (email✔) |
| `refund_diajukan` | `ajukan_refund` | pengelola |
| `refund_selesai` | `transisi_refund(selesai)` | pembeli (email✔) |
| `tukar_poin_berhasil` | `tukar` | user |
| `stempel_terverifikasi` | `selesaikan_misi`/`putuskan_verifikasi` | user |

Resolusi penyedia = dari `transaksi.(penyedia_tipe,penyedia_id)`/`pesanan_item`; bendahara/pengelola = query peran di desa. Peta ini hidup di **kode dispatcher** (bukan tabel) agar emitter tetap "bodoh". `email✔` = kanal ganda bila Resend siap; selain itu `in_app` saja.

### B.3 DTO ringkas
**Berita (publik):** `id, slug, judul, ringkasan, kategori, sampul{url}|null, sorotan, terbit_pada, tag[], penulis{nama}`. **(detail):** + `konten`. **(pengelola):** + `status, dihapus_pada`.
**Notifikasi:** `id, tipe, judul, isi, entitas_tipe, entitas_id, status, dibuat_pada, dibaca_pada|null`. Field sensitif outbox (`peristiwa.muatan`) **tak** keluar ke API.

### B.4 Gerbang pytest (kontrak addendum)
**Warta:** publik hanya melihat `publikasi` yang `terbit_pada<=now` (artikel terjadwal masa depan **tak** tampil publik, tampil bagi pengelola); `UNIQUE(desa_id, slug)`→409; soft delete hilang dari publik; hanya pengelola membuat/mempublikasi; keyset stabil.
**Genta:** emit menulis **satu** `peristiwa` dalam TX yang sama dengan perubahan status (uji: `_settle` → 1 peristiwa `pembayaran_berhasil`); dispatcher fan-out menulis `notifikasi` ke penerima **benar**; **idempotensi** — dispatcher jalan dua kali tak menggandakan (`UNIQUE(peristiwa_id,penerima_id,tipe)`); klien **tak** bisa membuat notifikasi; `baca`/`baca-semua` + `hitung` benar; isolasi tenant & kepemilikan (user hanya inbox sendiri; inbox desa lain→404).

---

## Bagian C — Migrasi & ketergantungan
- **Migrasi `0004_warta_genta`** (increment **setelah** `0003_f2`): buat `berita`, `berita_tag`, `peristiwa`, `notifikasi` + ALTER `media_lampiran.entitas_tipe`. Uji `upgrade head`→`downgrade` ke `0003_f2` bersih. Increment terpisah (bukan menyunting `0003_f2`) karena addendum = unit terkunci tersendiri → rollback granular.
- **Warta** mandiri (tak bergantung modul F2 lain) — bisa dikerjakan kapan saja setelah `0003_f2`.
- **Genta** bergantung pada titik emit di service **B9/B10/B12** → dikerjakan **setelah** ketiganya, dengan menambah `await outbox.emit(...)` di titik B.2 (satu-satunya sentuhan sah ke service F2 yang sudah jadi; bersifat **aditif & in-TX**, tak mengubah logika uang).

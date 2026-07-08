# ADR-08 — Ranking Pasar Desa berimbang (cegah rich-get-richer)

**Status:** Diterima (F1). Parameter ranking = **input tata kelola Pokdarwis**, bukan hard-code sepihak.
**Konteks pengambil keputusan:** Satria (technical lead) + co-architect; parameter final menunggu FGD Pokdarwis.
**Terkait:** ADR-04, brief B6/B8, KONTRAK F1 §7.3/§9.7, `sertifikasi_owner`.

## Konteks

Naik Kelas Lestari memberi owner tingkat sertifikasi (`tunas|bahari|lumba_lumba`). Godaan implementasi: mengurutkan listing Pasar Desa `ORDER BY tingkat DESC` agar owner regeneratif terangkat. Masalah: ini **rich-get-richer** — owner ber-tingkat tinggi dapat eksposur → transaksi → makin di atas; owner baru (Tunas) terkubur permanen. Ini bertentangan dengan misi **regeneratif-inklusif** (kesuksesan diukur Neraca Regeneratif + pemerataan nilai, bukan pemenang-ambil-semua).

## Keputusan

**Urutan listing = skor gabungan berimbang, bukan tingkat murni.**

- Faktor: `tingkat` (bobot mendorong praktik regeneratif) **+ kebaruan** (owner/produk baru dapat angkat awal) **+ rotasi eksposur** (slot acak-tertimbang agar owner baru tetap muncul di halaman awal) + rating.
- `sertifikasi_owner.tingkat` tetap **disimpan** (denormalized) agar sort murah — keputusan ini soal *fungsi ranking*, bukan sumber data.
- **Parameter (bobot tiap faktor, ambang skor tingkat, daftar "kartu wajib" Bahari) adalah input tata kelola Pokdarwis** — dikonfigurasi, bukan ditanam di kode. Pantau distribusi eksposur agar tak menyimpang jadi timpang.

## Konsekuensi

- Query listing B6 join `sertifikasi_owner`, tetapi `ORDER BY` memakai skor gabungan (bukan `tingkat` tunggal). Bobot dibaca dari konfigurasi per-desa.
- B8 mewujudkan recompute tingkat; B6 mewujudkan fungsi ranking — keduanya membaca parameter yang sama.
- **Blocker input (bukan teknis):** ambang tingkat & kartu wajib menunggu kesepakatan Pokdarwis sebelum go-live; sampai itu, pakai default scaffold (Tunas≥10, Bahari≥30, Lumba-Lumba≥50) sebagai *placeholder eksplisit*, jangan diperlakukan final.
- Menambah kebutuhan **observability**: log/metrik distribusi eksposur per tingkat untuk deteksi ketimpangan.

## Alternatif yang tidak diambil

- **`ORDER BY tingkat DESC` murni** — paling sederhana & paling "mendorong sertifikasi", tapi rich-get-richer yang melawan misi. Ditolak.
- **Abaikan tingkat dalam ranking** (murni rating/kebaruan) — adil tapi menghapus insentif regeneratif dari permukaan paling terlihat. Ditolak; tingkat tetap salah satu faktor.

## Pemicu tinjau ulang

Bila metrik menunjukkan eksposur tetap timpang (owner baru tak pernah terlihat) atau Pokdarwis menilai insentif kurang/berlebih, setel ulang bobot & rotasi. Karena parameter dikonfigurasi, penyetelan = ubah konfig, bukan deploy ulang logika.

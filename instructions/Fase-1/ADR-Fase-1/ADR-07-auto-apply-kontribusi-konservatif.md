# ADR-07 — Auto-apply kontribusi konservatif (flag, bukan entitas antrean)

**Status:** Diterima (F1).
**Konteks pengambil keputusan:** Satria (technical lead) + co-architect.
**Terkait:** ADR-04, brief B7, KONTRAK F1 §6.2/§9.6, ERD F1 `kontribusi`.

## Konteks

Kontribusi crowdsource (`foto|tips|koreksi_data|spot_baru|ulasan`) yang **disetujui** perlu "diterapkan" ke target. Dua pertanyaan: (a) seberapa jauh penerapan otomatis, (b) bagaimana koreksi/spot_baru yang disetujui-tapi-belum-diterapkan direpresentasikan — cukup status pada `kontribusi`, atau butuh entitas antrean penerapan tersendiri di ERD.

Prinsip blueprint: **data milik komunitas, kualitas dijaga**. Membiarkan crowdsource menulis langsung ke `destinasi` membuka pintu vandalisme/kesalahan tanpa review kedua.

## Keputusan

**Penerapan konservatif, direpresentasikan sebagai flag status pada `kontribusi` — tanpa entitas antrean baru.**

- `foto` disetujui → media dilampirkan ke target (aman, aditif).
- `tips`/`ulasan` disetujui → tersimpan & tampil pada detail target.
- `koreksi_data`/`spot_baru` disetujui → **tidak** memutasi `destinasi`. Kontribusi bertanda `status=disetujui` dan muncul sebagai **saran "terapkan"** di panel pengelola (query `kontribusi` `disetujui` yang belum ditindaklanjuti). Penerapan struktural tetap aksi pengelola lewat editor destinasi (B2).

Tidak menambah tabel antrean; "antrean penerapan" = query atas `kontribusi.status` + `tipe`.

## Konsekuensi

- **Tidak ada perubahan ERD** — hemat, konsisten dengan scaffold (approval hanya mencatat + award poin, tak memutasi target).
- Frontend B7/F7: tombol "Terapkan" pada antrean kurasi mengarahkan pengelola ke editor destinasi, bukan memicu mutasi otomatis.
- Batasan yang diterima: tak ada pelacakan halus "sudah diterapkan / oleh siapa / kapan" untuk koreksi selain jejak `kurasi_log` + edit destinasi. Cukup untuk volume F1.
- Award poin penyumbang tetap terjadi saat `disetujui` (independen dari apakah pengelola akhirnya menerapkan) — kontribusi yang valid dihargai walau penerapannya manual.

## Alternatif yang tidak diambil

- **Entitas antrean penerapan tersendiri** (mis. `usulan_perubahan` dengan state sendiri) — memberi pelacakan kaya (diterapkan/ditolak-terapkan, diff terstruktur, audit per-field). Ditolak untuk F1: menambah tabel + state machine kedua untuk kebutuhan yang belum terbukti bervolume. **Ini jalur upgrade** bila koreksi jadi sering.
- **Auto-apply penuh** (koreksi disetujui langsung menulis destinasi) — cepat tapi menghapus review kedua; risiko kualitas data tinggi. Ditolak.

## Pemicu tinjau ulang

Bila volume `koreksi_data`/`spot_baru` tinggi atau pengelola butuh audit per-field & status penerapan, promosikan ke entitas antrean tersendiri (migrasi increment + state machine) — perubahan aditif, tak membongkar yang ada.

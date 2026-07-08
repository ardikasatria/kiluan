# ADR-06 — Alokasi diskon kupon terhadap split escrow

**Status:** Diterima (F2). Memperjelas ADR-05 & ADR-02; wajib dikunci sebelum B10/B11.
**Konteks pengambil keputusan:** Satria (technical lead) + co-architect.
**Terkait:** `ERD_Kiluan_Fase2.md` (`transaksi`, `kupon`, `pemakaian_kupon`), `KONTRAK_API_Kiluan_Fase2.md` §5–§6, scaffold `kiluan_f2/layanan_dermaga._settle`. Ini "keputusan #1" pada brief F2.

## Konteks

`pesanan.total = subtotal − diskon + ongkir`. Pembeli membayar `total` (lebih kecil dari `subtotal` sebesar `diskon`). Namun split escrow dihitung per penyedia atas `bruto`. Bila `bruto = Σ subtotal` (pra-diskon), maka `Σ(fee + porsi_reinvestasi + neto_penyedia) = subtotal`, sedangkan uang yang benar-benar masuk escrow hanya `total = subtotal − diskon`. Ada **selisih `diskon`** yang harus ada sumber dananya. Scaffold F2 **sengaja menundanya** (memakai `bruto` pra-diskon, uji split tanpa kupon) — ADR ini menutup celah itu.

Pertanyaannya: **siapa menanggung diskon?** Tiga model koheren:
- **(A) Penyedia menanggung** — `bruto` dikurangi diskon (proporsional). `Σ bruto = total` → self-funding, invarian terjaga tanpa arus kas tambahan.
- **(B) Dana kampanye desa menanggung** — `bruto` penuh; selisih `diskon` disubsidi ke escrow dari dana kampanye riil (sejenis `dana_konservasi`). Penyedia terima neto penuh.
- **(C) Platform menanggung** — diskon jadi kerugian platform (fee negatif).

## Keputusan

**Diambil: (A) diskon selalu mengurangi `bruto` penyedia (self-funding), dengan beban diarahkan lewat `penyedia_terbatas` + opt-in.**

Mekanika yang mengikat B9/B10/B11:
1. **Alokasi diskon ke item eligible secara proporsional** terhadap `subtotal` item yang termasuk cakupan kupon (`penyedia_terbatas`; bila null = semua item). `diskon_i = diskon × subtotal_i / Σ subtotal_eligible`. Total alokasi tak boleh melebihi `subtotal_eligible`.
2. **`bruto_i = subtotal_i − diskon_i`.** Split dihitung atas `bruto` **setelah** diskon: `fee_platform = bruto_i × persen_fee`, `porsi_reinvestasi = bruto_i × persen_reinvestasi`, `neto_penyedia = bruto_i − fee − reinvestasi`. Penjualan berdiskon otomatis menyumbang reinvestasi proporsional lebih kecil — **jujur, bukan disembunyikan**.
3. **Beban diarahkan lewat cakupan + opt-in kupon:**
   - `promo_owner` → `penyedia_terbatas` = owner itu sendiri; owner menanggung promonya (marketing sendiri).
   - `tukar_poin` & `kampanye` → hanya menyasar penyedia yang **opt-in** program (masuk `penyedia_terbatas`). Penyedia peserta menanggung diskon sebagai biaya pemasaran, **sadar & sukarela** — pola koalisi loyalitas ritel. Kupon kampanye **tak boleh** memotong penyedia yang tak opt-in.
4. **Invarian tetap eksak** di level DB: `bruto = fee_platform + porsi_reinvestasi + neto_penyedia` (CHECK B9) berlaku karena split dihitung atas `bruto` pasca-diskon. `Σ bruto = total` → escrow selalu cukup, tanpa subsidi.

## Konsekuensi

- **Delta scaffold (implementasi B9/B10):** `checkout` mengalokasikan `diskon` ke tiap `pesanan_item` (simpan `diskon_teralokasi`/turunkan `bruto` per item); `_settle` memakai `bruto` pasca-diskon, bukan `Σ subtotal`. Uji split tanpa kupon **tetap valid**; tambah uji baru: alokasi proporsional benar, `Σ bruto = total`, invarian CHECK lolos, kupon menyasar non-peserta ditolak.
- **Opt-in wajib jadi data tata kelola:** daftar penyedia peserta program poin/kampanye dikelola Pokdarwis (lewat `penyedia_terbatas` kupon), bukan default platform. Frontend menandai "diskon dari UMKM peserta".
- **Reinvestasi realistis:** volume reinvestasi mengikuti pendapatan bersih (pasca-diskon), bukan angka kotor — konsisten dengan prinsip "regeneratif terukur, bukan greenwashing".
- **Tanpa arus kas kampanye di PkM** — cocok dengan jalur manual thin-slice; tak menuntut desa memegang dana subsidi.

## Alternatif yang tidak diambil

- **(B) Dana kampanye desa mendanai diskon (bruto penuh + subsidi escrow).** Lebih ideal secara misi (penyedia tak menanggung diskon kampanye), tapi butuh `dana_kampanye` riil + akuntansi subsidi yang **belum ada sampai F3** dan menambah arus kas berat untuk PkM manual. **Ditunda ke F3 sebagai peningkatan opsional:** bila desa ingin diskon "gratis bagi penyedia", sediakan `dana_kampanye` (pola `dana_konservasi`) dan ubah kupon kampanye jadi bruto-penuh + baris `transaksi(jenis=penyesuaian)` subsidi. Slot `jenis=penyesuaian` di ERD sudah menyiapkan jalur ini.
- **(C) Platform menanggung (fee negatif).** Ditolak — platform community-owned nyaris tanpa fee, tak punya kantong menanggung; akan memaksa fee naik = melawan positioning non-OTA.
- **Diskon memotong penyedia tanpa opt-in (A polos).** Ditolak — memaksa UMKM kecil menanggung kampanye platform bertentangan dengan misi regeneratif-inklusif; opt-in adalah syarat, bukan opsi.

## Pemicu tinjau ulang

Beralih ke (B) dipertimbangkan bila: di F3 tersedia `dana_kampanye` dan Pokdarwis ingin menjalankan diskon lintas-penyedia tanpa membebani vendor, ATAU program poin tumbuh besar sehingga redemption terasa seperti "platform mencetak kewajiban" bagi penyedia peserta — saat itu subsidi eksplisit dari dana kampanye lebih adil daripada opt-in.

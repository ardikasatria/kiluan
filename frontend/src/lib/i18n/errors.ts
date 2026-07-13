import type { Locale } from '@/i18n/routing'

/** Map stable API error codes to localized user-facing messages. */
const PESAN_ERROR: Record<Locale, Record<string, string>> = {
  id: {
    validasi_gagal: 'Data tidak valid. Periksa kembali isian Anda.',
    belum_diverifikasi: 'Akun belum diverifikasi. Periksa email Anda untuk kode verifikasi.',
    kredensial_salah: 'Email atau kata sandi salah.',
    tidak_ditemukan: 'Data tidak ditemukan.',
    tidak_diizinkan: 'Anda tidak memiliki izin untuk tindakan ini.',
    tidak_terautentikasi: 'Silakan masuk terlebih dahulu.',
    konflik: 'Permintaan bentrok dengan data yang ada.',
    terlalu_banyak_permintaan: 'Terlalu banyak permintaan. Coba lagi nanti.',
    kesalahan_server: 'Terjadi kesalahan pada server. Coba lagi nanti.',
    jaringan: 'Tidak dapat terhubung. Periksa koneksi Anda.',
    di_luar_geofence: 'Anda harus berada di stasiun yang ditentukan (di luar radius geofence).',
    bukti_kurang: 'Bukti verifikasi tidak memenuhi syarat — periksa QR, lokasi, atau foto.',
    bukti_media_wajib: 'Foto bukti wajib untuk metode ini.',
    indikator_tidak_aktif: 'Indikator tidak aktif atau tidak tersedia.',
    saldo_poin_kurang: 'Saldo poin Anda belum cukup untuk hadiah ini.',
    stok_habis: 'Hadiah ini baru saja habis. Pilih hadiah lain.',
    idempotency_key_wajib: 'Permintaan penukaran tidak valid. Silakan coba lagi.',
    kupon_tidak_berlaku: 'Kupon tidak berlaku untuk transaksi ini.',
    daya_dukung_terlampaui: 'Kapasitas spot hari ini sudah penuh. Pilih tanggal lain atau destinasi berbeda.',
    periode_final: 'Periode neraca sudah dikunci dan tidak dapat dihitung ulang.',
    job_sedang_berjalan: 'Perhitungan sedang berjalan. Coba lagi sebentar.',
    metrik_tidak_dikenal: 'Metrik tidak dikenal.',
    transisi_ilegal: 'Transisi status tidak diizinkan.',
    default: 'Terjadi kesalahan. Coba lagi.',
  },
  en: {
    validasi_gagal: 'Invalid data. Please check your input.',
    belum_diverifikasi: 'Account not yet verified. Check your email for a verification code.',
    kredensial_salah: 'Incorrect email or password.',
    tidak_ditemukan: 'Data not found.',
    tidak_diizinkan: 'You do not have permission for this action.',
    tidak_terautentikasi: 'Please sign in first.',
    konflik: 'The request conflicts with existing data.',
    terlalu_banyak_permintaan: 'Too many requests. Try again later.',
    kesalahan_server: 'A server error occurred. Please try again later.',
    jaringan: 'Unable to connect. Check your network.',
    di_luar_geofence: 'You must be at the designated station (outside the geofence radius).',
    bukti_kurang: 'Verification evidence is insufficient — check QR, location, or photo.',
    bukti_media_wajib: 'Photo evidence is required for this method.',
    indikator_tidak_aktif: 'Indicator is inactive or unavailable.',
    saldo_poin_kurang: 'You do not have enough points for this reward.',
    stok_habis: 'This reward has just run out. Choose another reward.',
    idempotency_key_wajib: 'The redemption request is invalid. Please try again.',
    kupon_tidak_berlaku: 'This coupon is not valid for the transaction.',
    daya_dukung_terlampaui: 'Today\'s spot capacity is full. Choose another date or destination.',
    periode_final: 'This balance period is locked and cannot be recalculated.',
    job_sedang_berjalan: 'A calculation is already in progress. Try again shortly.',
    metrik_tidak_dikenal: 'Unknown metric.',
    transisi_ilegal: 'Status transition is not allowed.',
    default: 'Something went wrong. Please try again.',
  },
}

export function pesanErrorDariKode(kode: string | undefined | null, locale: Locale): string {
  const tabel = PESAN_ERROR[locale]
  if (!kode) return tabel.default
  return tabel[kode] ?? tabel.default
}

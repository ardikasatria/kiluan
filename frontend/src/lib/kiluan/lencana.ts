const LABEL_AKSI: Record<string, string> = {
  kontribusi_disetujui: 'Kontribusi disetujui',
  produk_terdaftar: 'Produk terdaftar',
  paket_dipublikasi: 'Paket dipublikasi',
  profil_lengkap: 'Profil lengkap',
  warga_perintis: 'Warga perintis',
}

export function labelAksiPoin(
  kode: string,
  t?: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (t) {
    const key = `aksi.${kode}`
    try {
      return t(key)
    } catch {
      /* fallback */
    }
  }
  return LABEL_AKSI[kode] ?? kode.replace(/_/g, ' ')
}

export function deskripsiSyaratBadge(
  syarat: Record<string, unknown>,
  t?: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (typeof syarat.poin_min === 'number') {
    if (t) {
      try {
        return t('syaratBadge.poinMin', { poin: syarat.poin_min })
      } catch {
        /* fallback */
      }
    }
    return `Kumpulkan minimal ${syarat.poin_min} poin di desa ini`
  }
  if (typeof syarat.aksi === 'string' && typeof syarat.jumlah === 'number') {
    const aksi = labelAksiPoin(syarat.aksi, t)
    if (t) {
      try {
        return t('syaratBadge.aksi', { jumlah: syarat.jumlah, aksi })
      } catch {
        /* fallback */
      }
    }
    return `${syarat.jumlah}× ${aksi}`
  }
  return t ? t('syaratBadge.khusus') : 'Syarat khusus'
}

export function formatTanggal(iso?: string | null, locale = 'id-ID'): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

const LABEL_AKSI: Record<string, string> = {
  kontribusi_disetujui: 'Kontribusi disetujui',
  produk_terdaftar: 'Produk terdaftar',
  paket_dipublikasi: 'Paket dipublikasi',
  profil_lengkap: 'Profil lengkap',
  warga_perintis: 'Warga perintis',
}

export function labelAksiPoin(kode: string): string {
  return LABEL_AKSI[kode] ?? kode.replace(/_/g, ' ')
}

export function deskripsiSyaratBadge(syarat: Record<string, unknown>): string {
  if (typeof syarat.poin_min === 'number') {
    return `Kumpulkan minimal ${syarat.poin_min} poin di desa ini`
  }
  if (typeof syarat.aksi === 'string' && typeof syarat.jumlah === 'number') {
    return `${syarat.jumlah}× ${labelAksiPoin(syarat.aksi)}`
  }
  return 'Syarat khusus'
}

export function formatTanggal(iso?: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('id-ID', {
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

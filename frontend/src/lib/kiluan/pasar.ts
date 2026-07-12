const SATUAN: Record<string, string> = {
  per_orang: '/orang',
  per_paket: '/paket',
  per_malam: '/malam',
  per_unit: '/unit',
  per_jam: '/jam',
}

const STATUS_PAKET: Record<string, string> = {
  draft: 'Draf',
  review: 'Menunggu kurasi',
  publikasi: 'Publikasi',
  ditolak: 'Ditolak',
  arsip: 'Arsip',
}

const STATUS_VERIFIKASI: Record<string, string> = {
  menunggu: 'Menunggu verifikasi',
  terverifikasi: 'Terverifikasi',
  ditolak: 'Ditolak',
}

const TINGKAT_SERTIFIKASI: Record<string, string> = {
  tunas: 'Tunas',
  bahari: 'Bahari',
  lumba_lumba: 'Lumba-Lumba',
}

export function formatHarga(harga: number, satuan?: string): string {
  const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
  const suf = satuan ? SATUAN[satuan] ?? '' : ''
  return `${fmt.format(harga)}${suf}`
}

export function labelStatusPaket(status: string): string {
  return STATUS_PAKET[status] ?? status
}

export function labelVerifikasiUmkm(status: string): string {
  return STATUS_VERIFIKASI[status] ?? status
}

export function labelSertifikasi(tingkat?: string | null): string | null {
  if (!tingkat) return null
  return TINGKAT_SERTIFIKASI[tingkat] ?? tingkat
}

export function warnaStatusPaket(status: string): string {
  switch (status) {
    case 'publikasi':
      return 'bg-kiluan-mint/20 text-primary-800 ring-kiluan-mint/40'
    case 'review':
      return 'bg-amber-50 text-amber-900 ring-amber-200'
    case 'ditolak':
      return 'bg-red-50 text-red-800 ring-red-200'
    case 'arsip':
      return 'bg-neutral-100 text-neutral-600 ring-neutral-200'
    default:
      return 'bg-neutral-100 text-neutral-700 ring-neutral-200'
  }
}

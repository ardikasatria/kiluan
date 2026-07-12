import type { NotifikasiItem } from '@/lib/api/types'

/** Deep-link ke halaman entitas terkait notifikasi. */
export function urlEntitasNotifikasi(desaSlug: string, n: Pick<NotifikasiItem, 'entitas_tipe' | 'entitas_id'>): string {
  switch (n.entitas_tipe) {
    case 'pesanan':
      return `/${desaSlug}/pesanan/${n.entitas_id}`
    case 'booking':
      return `/${desaSlug}/pesanan/${n.entitas_id}`
    case 'pembayaran':
      return `/${desaSlug}/kelola/bendahara`
    case 'payout':
      return `/${desaSlug}/kelola/pendapatan`
    case 'refund':
      return `/${desaSlug}/kelola/refund`
    case 'paspor':
      return '/paspor'
    case 'stempel':
      return '/paspor'
    default:
      return `/${desaSlug}/notifikasi`
  }
}

export function formatWaktuRelatif(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const menit = Math.floor(diff / 60_000)
  if (menit < 1) return 'Baru saja'
  if (menit < 60) return `${menit} menit lalu`
  const jam = Math.floor(menit / 60)
  if (jam < 24) return `${jam} jam lalu`
  const hari = Math.floor(jam / 24)
  if (hari < 7) return `${hari} hari lalu`
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(iso))
}

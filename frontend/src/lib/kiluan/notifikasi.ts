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

export function formatWaktuRelatif(
  iso: string,
  opts?: { t?: (key: string, values?: Record<string, string | number>) => string; locale?: string },
): string {
  const diff = Date.now() - new Date(iso).getTime()
  const menit = Math.floor(diff / 60_000)
  const t = opts?.t
  const locale = opts?.locale ?? 'id-ID'

  if (menit < 1) return t ? t('waktu.baru') : 'Baru saja'
  if (menit < 60) return t ? t('waktu.menit', { count: menit }) : `${menit} menit lalu`
  const jam = Math.floor(menit / 60)
  if (jam < 24) return t ? t('waktu.jam', { count: jam }) : `${jam} jam lalu`
  const hari = Math.floor(jam / 24)
  if (hari < 7) return t ? t('waktu.hari', { count: hari }) : `${hari} hari lalu`
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(iso))
}

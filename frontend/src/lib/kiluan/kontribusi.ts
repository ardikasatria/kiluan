import type { KontribusiItem, TipeKontribusi } from '@/lib/api/types'

const LABEL_TIPE: Record<TipeKontribusi, string> = {
  foto: 'Foto',
  tips: 'Tips',
  koreksi_data: 'Koreksi data',
  spot_baru: 'Usul spot baru',
  ulasan: 'Ulasan',
}

const LABEL_STATUS: Record<string, string> = {
  menunggu: 'Menunggu kurasi',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  revisi: 'Perlu revisi',
}

export function labelTipeKontribusi(tipe: TipeKontribusi, t?: (key: string) => string): string {
  if (t) return t(`tipe.${tipe}`)
  return LABEL_TIPE[tipe] ?? tipe
}

export function labelStatusKontribusi(status: string, t?: (key: string) => string): string {
  if (t) return t(`status.${status}`)
  return LABEL_STATUS[status] ?? status
}

export function warnaStatusKontribusi(status: string): string {
  switch (status) {
    case 'disetujui':
      return 'bg-kiluan-mint/20 text-primary-800 ring-kiluan-mint/40 dark:bg-kiluan-mint/15 dark:text-kiluan-mint dark:ring-kiluan-mint/30'
    case 'menunggu':
      return 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800'
    case 'revisi':
      return 'bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800'
    case 'ditolak':
      return 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-800'
    default:
      return 'bg-neutral-100 text-neutral-700 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700'
  }
}

const LABEL_TARGET: Record<string, string> = {
  destinasi: 'Destinasi',
  layanan: 'Layanan',
  umkm: 'UMKM',
  paket_wisata: 'Paket wisata',
  desa: 'Desa',
}

export function labelTargetKontribusi(target: string, t?: (key: string) => string): string {
  if (t) return t(`target.${target}`)
  return LABEL_TARGET[target] ?? target
}

export function ringkasanMuatan(item: KontribusiItem, t?: (key: string) => string): string {
  const m = item.muatan
  if (item.tipe === 'tips' || item.tipe === 'ulasan') {
    return String(m.isi ?? m.teks ?? '')
  }
  if (item.tipe === 'koreksi_data') {
    return `${m.field}: ${m.usulan}`
  }
  if (item.tipe === 'spot_baru') {
    return String(m.nama ?? (t ? t('muatan.spotBaru') : 'Usulan spot baru'))
  }
  if (item.tipe === 'foto') {
    return String(m.keterangan ?? (t ? t('muatan.foto') : 'Foto kontribusi'))
  }
  return JSON.stringify(m).slice(0, 80)
}

export function perluTombolTerapkan(item: KontribusiItem): boolean {
  return item.status === 'disetujui' && (item.tipe === 'koreksi_data' || item.tipe === 'spot_baru')
}

export function urlTerapkan(desaSlug: string, item: KontribusiItem): string | null {
  if (item.tipe === 'koreksi_data' && item.target_tipe === 'destinasi' && item.target_id) {
    return `/${desaSlug}/kelola/destinasi/${item.target_id}`
  }
  if (item.tipe === 'spot_baru') {
    return `/${desaSlug}/kelola/destinasi/baru`
  }
  return null
}

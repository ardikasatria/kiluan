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

export function labelTipeKontribusi(tipe: TipeKontribusi): string {
  return LABEL_TIPE[tipe] ?? tipe
}

export function labelStatusKontribusi(status: string): string {
  return LABEL_STATUS[status] ?? status
}

export function warnaStatusKontribusi(status: string): string {
  switch (status) {
    case 'disetujui':
      return 'bg-kiluan-mint/20 text-primary-800 ring-kiluan-mint/40'
    case 'menunggu':
      return 'bg-amber-50 text-amber-900 ring-amber-200'
    case 'revisi':
      return 'bg-blue-50 text-blue-800 ring-blue-200'
    case 'ditolak':
      return 'bg-red-50 text-red-800 ring-red-200'
    default:
      return 'bg-neutral-100 text-neutral-700 ring-neutral-200'
  }
}

export function ringkasanMuatan(item: KontribusiItem): string {
  const m = item.muatan
  if (item.tipe === 'tips' || item.tipe === 'ulasan') {
    return String(m.isi ?? m.teks ?? '')
  }
  if (item.tipe === 'koreksi_data') {
    return `${m.field}: ${m.usulan}`
  }
  if (item.tipe === 'spot_baru') {
    return String(m.nama ?? 'Usulan spot baru')
  }
  if (item.tipe === 'foto') {
    return String(m.keterangan ?? 'Foto kontribusi')
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

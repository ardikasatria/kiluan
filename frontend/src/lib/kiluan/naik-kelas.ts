import type { StatusPengajuanKartu } from '@/lib/api/types'

const STATUS: Record<StatusPengajuanKartu, string> = {
  menunggu: 'Menunggu validasi',
  tervalidasi: 'Tervalidasi',
  ditolak: 'Ditolak',
  revisi: 'Perlu revisi',
}

export function labelStatusPengajuan(status: StatusPengajuanKartu | string): string {
  return STATUS[status as StatusPengajuanKartu] ?? status
}

export function warnaStatusPengajuan(status: string): string {
  switch (status) {
    case 'tervalidasi':
      return 'bg-kiluan-mint/20 text-primary-800 ring-kiluan-mint/40'
    case 'menunggu':
      return 'bg-amber-50 text-amber-900 ring-amber-200'
    case 'revisi':
      return 'bg-sky-50 text-sky-900 ring-sky-200'
    case 'ditolak':
      return 'bg-red-50 text-red-800 ring-red-200'
    default:
      return 'bg-neutral-100 text-neutral-700 ring-neutral-200'
  }
}

export function labelBuktiDibutuhkan(bukti: Record<string, boolean>): string[] {
  const labels: string[] = []
  if (bukti.foto) labels.push('Foto bukti')
  if (bukti.dokumen) labels.push('Dokumen')
  if (bukti.pernyataan) labels.push('Pernyataan teks')
  return labels
}

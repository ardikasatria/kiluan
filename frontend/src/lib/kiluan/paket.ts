import type { PaketRingkas } from '@/lib/api/types'

export type DurasiFilter = '1-hari' | 'keluarga'

export const OPSI_DURASI_PAKET: { param: DurasiFilter | null; label: string }[] = [
  { param: null, label: 'Semua Paket' },
  { param: '1-hari', label: 'Paket Sehari' },
  { param: 'keluarga', label: 'Paket Keluarga' },
]

export function parseDurasiFilter(raw: string | null): DurasiFilter | null {
  if (raw === '1-hari' || raw === 'keluarga') return raw
  return null
}

/** Filter katalog paket sesuai query `?durasi=` di navigasi. */
export function filterPaketDurasi(paket: PaketRingkas[], durasi: DurasiFilter | null): PaketRingkas[] {
  if (!durasi) return paket
  if (durasi === '1-hari') return paket.filter((p) => p.durasi_jam <= 24)
  if (durasi === 'keluarga') return paket.filter((p) => p.kuota_default >= 4)
  return paket
}

export function labelDurasiFilter(durasi: DurasiFilter | null): string | null {
  if (!durasi) return null
  return OPSI_DURASI_PAKET.find((o) => o.param === durasi)?.label ?? null
}

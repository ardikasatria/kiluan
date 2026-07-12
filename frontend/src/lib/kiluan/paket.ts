import type { PaketItemRow, PaketRingkas } from '@/lib/api/types'

export type DurasiFilter = '1-hari' | 'keluarga'

export type KodeDurasiPaket = 'semua' | 'sehari' | 'keluarga'

export type StatusPaketFilter = 'semua' | 'draft' | 'review' | 'publikasi' | 'ditolak' | 'arsip'

export const OPSI_DURASI_PAKET: { param: DurasiFilter | null; kode: KodeDurasiPaket }[] = [
  { param: null, kode: 'semua' },
  { param: '1-hari', kode: 'sehari' },
  { param: 'keluarga', kode: 'keluarga' },
]

export const OPSI_STATUS_PAKET: StatusPaketFilter[] = [
  'semua',
  'draft',
  'review',
  'publikasi',
  'ditolak',
  'arsip',
]

const LABEL_DURASI: Record<KodeDurasiPaket, string> = {
  semua: 'Semua Paket',
  sehari: 'Paket Sehari',
  keluarga: 'Paket Keluarga',
}

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

export function filterPaketStatus(paket: PaketRingkas[], status: StatusPaketFilter): PaketRingkas[] {
  if (status === 'semua') return paket
  return paket.filter((p) => p.status === status)
}

export function kodeDurasiFilter(durasi: DurasiFilter | null): KodeDurasiPaket | null {
  if (!durasi) return null
  return durasi === '1-hari' ? 'sehari' : 'keluarga'
}

export function labelDurasiFilter(durasi: DurasiFilter | null, t?: (key: string) => string): string | null {
  const kode = kodeDurasiFilter(durasi)
  if (!kode) return null
  if (t) return t(`durasi.${kode}`)
  return LABEL_DURASI[kode]
}

/** Kelompokkan item itinerary per hari, terurut urutan. */
export function kelompokItineraryPerHari(item: PaketItemRow[]): { hari: number; item: PaketItemRow[] }[] {
  const map = new Map<number, PaketItemRow[]>()
  for (const it of item) {
    const list = map.get(it.hari) ?? []
    list.push(it)
    map.set(it.hari, list)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hari, rows]) => ({
      hari,
      item: [...rows].sort((x, y) => x.urutan - y.urutan),
    }))
}

/** Label tampilan item: judul atau nama referensi. */
export function labelItemItinerary(it: PaketItemRow): string {
  if (it.judul?.trim()) return it.judul.trim()
  return it.destinasi?.nama ?? it.layanan?.nama ?? it.produk_jasa?.nama ?? '—'
}

/** Apakah paket boleh diedit metadata/itinerary oleh agen. */
export function paketBisaDiedit(status: string): boolean {
  return status === 'draft' || status === 'ditolak'
}

/** Tombol transisi agen yang tersedia. */
export function aksiPaketAgen(status: string): ('ajukan' | 'arsip')[] {
  if (status === 'draft' || status === 'ditolak') return ['ajukan']
  if (status === 'publikasi') return ['arsip']
  return []
}

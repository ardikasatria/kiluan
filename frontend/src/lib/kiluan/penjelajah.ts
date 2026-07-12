import type { Lokasi, MisiRingkas, PasporDto, StempelDto } from '@/lib/api/types'

export const KATEGORI_MISI = ['', 'mangrove', 'karang', 'sampah', 'lumba', 'budaya'] as const

export type KategoriMisi = (typeof KATEGORI_MISI)[number]

export function jarakMeter(a: Lokasi, b: Lokasi): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)))
}

/** Kategori belajar yang sudah terverifikasi di paspor (membuka misi aksi). */
export function kategoriBelajarTerverifikasi(
  paspor: PasporDto | null,
  belajarById: Map<string, MisiRingkas>,
): Set<string> {
  const kat = new Set<string>()
  if (!paspor) return kat
  for (const s of paspor.stempel) {
    if (s.status !== 'terverifikasi') continue
    const belajar = belajarById.get(s.misi_id)
    if (belajar?.jenis === 'belajar') kat.add(belajar.kategori)
  }
  return kat
}

export function misiAksiTerkunci(m: MisiRingkas, katUnlock: Set<string>): boolean {
  return m.jenis === 'aksi' && !katUnlock.has(m.kategori)
}

export function metodeVerifikasi(syarat: Record<string, unknown> | undefined): string {
  return (syarat?.metode as string) ?? 'otomatis'
}

export function butuhFotoBukti(syarat: Record<string, unknown> | undefined): boolean {
  return Boolean((syarat?.bukti as Record<string, unknown> | undefined)?.foto)
}

export function teksDampakTemplate(dampak: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(dampak)) {
    if (typeof v === 'number') out[k] = v
  }
  return out
}

export function kelompokStempel(stempel: StempelDto[]) {
  return {
    terverifikasi: stempel.filter((s) => s.status === 'terverifikasi'),
    menunggu: stempel.filter((s) => s.status === 'menunggu_verifikasi'),
    ditolak: stempel.filter((s) => s.status === 'ditolak'),
  }
}

export function warnaBadgeStempel(status: StempelDto['status']): string {
  if (status === 'terverifikasi') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
  }
  if (status === 'menunggu_verifikasi') {
    return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
  }
  return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
}

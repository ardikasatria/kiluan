import type { PeranKode } from '@/lib/kiluan/peran'

/** Peran yang ditawarkan di wizard Gabung Komunitas (F-Onboarding). */
export const PERAN_GABUNG = ['wisatawan', 'umkm', 'agen', 'pokdarwis'] as const

export type PeranGabung = (typeof PERAN_GABUNG)[number]

export type LangkahGabung = 'peran' | 'desa' | 'konfirmasi' | 'hasil'

export type HasilGabung = 'aktif' | 'menunggu' | 'konflik' | 'sudah_aktif'

export function memerlukanPilihDesa(peran: PeranKode): boolean {
  return peran !== 'wisatawan'
}

export function langkahGabung(peran: PeranKode | null): LangkahGabung[] {
  if (!peran || peran === 'wisatawan') return ['peran', 'konfirmasi', 'hasil']
  return ['peran', 'desa', 'konfirmasi', 'hasil']
}

export function indeksLangkah(peran: PeranKode | null, langkah: LangkahGabung): number {
  return langkahGabung(peran).indexOf(langkah)
}

export function peranGabungValid(kode: string | undefined | null): PeranGabung | null {
  if (!kode) return null
  return (PERAN_GABUNG as readonly string[]).includes(kode) ? (kode as PeranGabung) : null
}

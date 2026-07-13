import type { KeanggotaanSaya, ProfilSaya } from '@/lib/api/auth'
import { RUTE_GABUNG } from '@/lib/kiluan/rute-sigerciv'
import {
  dasborHref,
  normalisasiPeranKeanggotaan,
  type PeranKode,
} from '@/lib/kiluan/peran'

/** Peran yang bisa diajukan wisatawan (eskalasi dari default). */
export const PERAN_ESKALASI = ['kontributor', 'umkm', 'agen', 'organisasi'] as const

export type PeranEskalasi = (typeof PERAN_ESKALASI)[number]

export type StatusAjuan = KeanggotaanSaya['status'] | 'belum'

export interface EntriAjuanPeran {
  peran: PeranKode
  status: StatusAjuan
  desaId: string | null
  desaSlug: string | null
  desaNama: string | null
}

export interface RingkasanAjuanPeran {
  peran: PeranEskalasi
  /** Entri per desa; kosong = belum pernah ajukan. */
  entri: EntriAjuanPeran[]
  /** Status agregat untuk badge kartu. */
  statusUtama: StatusAjuan
}

const URUTAN_STATUS: StatusAjuan[] = ['aktif', 'menunggu', 'revisi', 'ditolak', 'nonaktif', 'belum']

function statusLebihUtama(a: StatusAjuan, b: StatusAjuan): StatusAjuan {
  return URUTAN_STATUS.indexOf(a) <= URUTAN_STATUS.indexOf(b) ? a : b
}

function entriKeAjuan(
  peran: PeranKode,
  k: KeanggotaanSaya,
  desaMap: Map<string, { slug: string; nama: string }>,
): EntriAjuanPeran {
  const desaId = k.desa_id ? String(k.desa_id) : null
  const desa = desaId ? desaMap.get(desaId) : null
  return {
    peran,
    status: k.status as StatusAjuan,
    desaId,
    desaSlug: desa?.slug ?? null,
    desaNama: desa?.nama ?? null,
  }
}

/** Ringkasan pengajuan per peran eskalasi untuk dasbor wisatawan. */
export function ringkasanAjuanWisatawan(
  profil: ProfilSaya | null,
  desaMap: Map<string, { slug: string; nama: string }>,
): RingkasanAjuanPeran[] {
  if (!profil) {
    return PERAN_ESKALASI.map((peran) => ({ peran, entri: [], statusUtama: 'belum' }))
  }

  return PERAN_ESKALASI.map((peran) => {
    const entri = profil.keanggotaan
      .filter((k) => normalisasiPeranKeanggotaan(k.peran) === peran)
      .map((k) => entriKeAjuan(peran, k, desaMap))

    const statusUtama = entri.reduce<StatusAjuan>(
      (acc, e) => statusLebihUtama(acc, e.status),
      'belum',
    )

    return { peran, entri, statusUtama: entri.length === 0 ? 'belum' : statusUtama }
  })
}

/** URL wizard onboarding global — form penuh tetap di /gabung. */
export function hrefGabung(peran: PeranKode, desaSlug?: string | null): string {
  if (peran === 'organisasi') {
    return `${RUTE_GABUNG}/organisasi`
  }
  const q = new URLSearchParams({ peran })
  if (desaSlug) q.set('desa', desaSlug)
  return `${RUTE_GABUNG}?${q.toString()}`
}

/** Destinasi dasbor peran desa bila slug diketahui. */
export function hrefDasborPeranAktif(peran: PeranKode, desaSlug: string | null, desaPilot: string): string {
  if (peran === 'organisasi' || peran === 'wisatawan') {
    return peran === 'organisasi' ? `${RUTE_GABUNG}/organisasi` : '/dasbor/wisatawan'
  }
  return dasborHref(desaSlug ?? desaPilot, peran)
}

export function punyaAjuanMenunggu(profil: ProfilSaya | null): boolean {
  if (!profil) return false
  return profil.keanggotaan.some((k) => k.status === 'menunggu')
}

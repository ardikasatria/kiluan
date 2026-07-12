import type { ProfilSaya } from '@/lib/api/auth'
import { RUTE_DASBOR, RUTE_DASBOR_WISATAWAN } from '@/lib/kiluan/rute-sigerciv'

/** Kode peran sesuai backend RBAC */
export type PeranKode =
  | 'wisatawan'
  | 'pokdarwis'
  | 'umkm'
  | 'agen'
  | 'kontributor'
  | 'organisasi'
  | 'perangkat_desa'
  | 'admin'

export const SEMUA_PERAN: PeranKode[] = [
  'wisatawan',
  'pokdarwis',
  'umkm',
  'agen',
  'kontributor',
  'organisasi',
  'perangkat_desa',
  'admin',
]

const SLUG_TO_KODE: Record<string, PeranKode> = {
  wisatawan: 'wisatawan',
  pokdarwis: 'pokdarwis',
  umkm: 'umkm',
  agen: 'agen',
  kontributor: 'kontributor',
  organisasi: 'organisasi',
  'perangkat-desa': 'perangkat_desa',
  admin: 'admin',
}

const KODE_TO_SLUG: Record<PeranKode, string> = {
  wisatawan: 'wisatawan',
  pokdarwis: 'pokdarwis',
  umkm: 'umkm',
  agen: 'agen',
  kontributor: 'kontributor',
  organisasi: 'organisasi',
  perangkat_desa: 'perangkat-desa',
  admin: 'admin',
}

export function peranDariSlug(slug: string): PeranKode | null {
  return SLUG_TO_KODE[slug] ?? null
}

export function slugPeran(kode: PeranKode): string {
  return KODE_TO_SLUG[kode]
}

/**
 * Label peran. Beri `t` (namespace `peran`) untuk label sesuai locale;
 * tanpa `t` jatuh ke label Bahasa Indonesia.
 */
export function labelPeran(kode: PeranKode, t?: (key: PeranKode) => string): string {
  if (t) return t(kode)
  const labels: Record<PeranKode, string> = {
    wisatawan: 'Wisatawan',
    pokdarwis: 'Organisasi',
    umkm: 'UMKM',
    agen: 'Agen Lokal',
    kontributor: 'Kontributor',
    organisasi: 'Organisasi / Mitra',
    perangkat_desa: 'Perangkat Desa',
    admin: 'Admin / Steward',
  }
  return labels[kode]
}

/** Peran global (tidak terikat tenant desa) */
export function peranGlobal(kode: PeranKode): boolean {
  return kode === 'wisatawan' || kode === 'admin'
}

export function punyaPeran(profil: ProfilSaya | null, kode: PeranKode): boolean {
  if (!profil) return false
  const aktif = profil.keanggotaan.filter((k) => k.status === 'aktif')
  if (kode === 'admin') {
    return aktif.some((k) => k.peran === 'admin' && k.desa_id === null)
  }
  if (kode === 'wisatawan') {
    return aktif.some((k) => k.peran === 'wisatawan')
  }
  return aktif.some((k) => k.peran === kode)
}

export function daftarPeranPengguna(profil: ProfilSaya | null): PeranKode[] {
  if (!profil) return []
  return SEMUA_PERAN.filter((k) => punyaPeran(profil, k))
}

/** Peran dengan keanggotaan aktif saja. */
export function peranAktifPengguna(profil: ProfilSaya | null): PeranKode[] {
  return daftarPeranPengguna(profil)
}

/** Tampilkan pemilih /dasbor bila pengguna punya lebih dari satu peran aktif. */
export function perluPemilihDasbor(profil: ProfilSaya | null): boolean {
  return peranAktifPengguna(profil).length > 1
}

/** Destinasi dasbor utama — wisatawan & multi-peran global; peran desa tetap scoped. */
export function dasborUtamaHref(profil: ProfilSaya | null, desaSlug: string): string {
  const aktif = peranAktifPengguna(profil)
  if (aktif.length === 1) {
    return dasborHref(desaSlug, aktif[0])
  }
  return RUTE_DASBOR
}

/** Status keanggotaan untuk peran (termasuk menunggu/ditolak) */
export function statusKeanggotaan(
  profil: ProfilSaya | null,
  kode: PeranKode,
): 'aktif' | 'menunggu' | 'ditolak' | 'revisi' | null {
  if (!profil) return null
  const cocok = profil.keanggotaan.filter((k) => k.peran === kode)
  if (cocok.length === 0) return null
  if (cocok.some((k) => k.status === 'aktif')) return 'aktif'
  if (cocok.some((k) => k.status === 'menunggu')) return 'menunggu'
  if (cocok.some((k) => k.status === 'revisi')) return 'revisi'
  if (cocok.some((k) => k.status === 'ditolak')) return 'ditolak'
  return null
}

export function dasborHref(desaSlug: string, kode: PeranKode): string {
  if (kode === 'admin') return '/admin/dasbor'
  if (kode === 'wisatawan') return RUTE_DASBOR_WISATAWAN
  return `/${desaSlug}/dasbor/${slugPeran(kode)}`
}

import type { ProfilSaya } from '@/lib/api/auth'

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

export function labelPeran(kode: PeranKode): string {
  const labels: Record<PeranKode, string> = {
    wisatawan: 'Wisatawan',
    pokdarwis: 'Pokdarwis',
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

export function dasborHref(desaSlug: string, kode: PeranKode): string {
  if (kode === 'admin') return '/admin/dasbor'
  return `/${desaSlug}/dasbor/${slugPeran(kode)}`
}

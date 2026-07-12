/** Rute platform Sigerciv (lintas desa) — bukan terikat satu desa di URL. */

export const RUTE_DASBOR = '/dasbor'
export const RUTE_DASBOR_WISATAWAN = '/dasbor/wisatawan'

export function ruteSaya(subpath: string): string {
  const p = subpath.replace(/^\//, '')
  return `/saya/${p}`
}

export const RUTE_WISATAWAN = {
  dasbor: RUTE_DASBOR_WISATAWAN,
  wishlist: ruteSaya('wishlist'),
  akun: ruteSaya('akun'),
  paspor: '/paspor',
  discovery: '/jelajah',
} as const

/** Rute platform Sigerciv (lintas desa) — bukan terikat satu desa di URL. */

import { withLocale } from '@/lib/i18n/locale-path'
import type { Locale } from '@/i18n/routing'
import { defaultLocale } from '@/i18n/routing'

export const RUTE_DASBOR = '/dasbor'
export const RUTE_DASBOR_WISATAWAN = '/dasbor/wisatawan'
export const RUTE_GABUNG = '/gabung'

export function ruteSaya(subpath: string, locale: Locale = defaultLocale): string {
  const p = subpath.replace(/^\//, '')
  return withLocale(`/saya/${p}`, locale)
}

export const RUTE_WISATAWAN = {
  dasbor: RUTE_DASBOR_WISATAWAN,
  wishlist: '/saya/wishlist',
  akun: '/saya/akun',
  paspor: '/paspor',
  discovery: '/jelajah',
} as const

/** Locale-aware paths for platform routes (prefix `/id` or `/en`). */
export function ruteWisatawan(locale: Locale = defaultLocale) {
  return {
    dasbor: withLocale(RUTE_WISATAWAN.dasbor, locale),
    wishlist: withLocale(RUTE_WISATAWAN.wishlist, locale),
    akun: withLocale(RUTE_WISATAWAN.akun, locale),
    paspor: withLocale(RUTE_WISATAWAN.paspor, locale),
    discovery: withLocale(RUTE_WISATAWAN.discovery, locale),
  }
}

export { withLocale }

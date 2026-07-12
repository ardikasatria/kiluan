import { kodeGalat, pesanGalat } from '@/lib/api/galat'
import type { Locale } from '@/i18n/routing'
import { pesanErrorDariKode } from './errors'

/** Localize API errors: map by stable `kode`; fallback safely for EN. */
export function pesanGalatLokal(err: unknown, locale: Locale): string {
  const kode = kodeGalat(err)
  if (kode) return pesanErrorDariKode(kode, locale)
  if (locale === 'en') return pesanErrorDariKode('default', locale)
  return pesanGalat(err, locale)
}

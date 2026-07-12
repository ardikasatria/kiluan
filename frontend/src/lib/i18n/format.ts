import type { Locale } from '@/i18n/routing'

/** Format Rupiah per locale (ICU via Intl). */
export function formatRupiah(value: number, locale: Locale): string {
  const intlLocale = locale === 'id' ? 'id-ID' : 'en'
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Format jumlah poin tanpa mengasumsikan locale Indonesia. */
export function formatPoin(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en').format(value)
}

/** Format tanggal per locale. */
export function formatTanggal(value: Date | string | number, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  const date = value instanceof Date ? value : new Date(value)
  const intlLocale = locale === 'id' ? 'id-ID' : 'en'
  return new Intl.DateTimeFormat(intlLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  }).format(date)
}

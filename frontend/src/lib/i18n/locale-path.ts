import { defaultLocale, type Locale } from '@/i18n/routing'

/** Prefix internal path with locale segment (e.g. `/jelajah` → `/id/jelajah`). */
export function withLocale(path: string, locale: Locale = defaultLocale): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (normalized === '/') return `/${locale}`
  return `/${locale}${normalized}`
}

/** Strip leading locale segment from pathname. */
export function stripLocale(pathname: string, locales: readonly string[] = ['id', 'en']): string {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length > 0 && locales.includes(segments[0]!)) {
    const rest = segments.slice(1).join('/')
    return rest ? `/${rest}` : '/'
  }
  return pathname || '/'
}

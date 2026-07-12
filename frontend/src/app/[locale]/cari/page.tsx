import type { Locale } from '@/i18n/routing'
import { withLocale } from '@/lib/i18n/locale-path'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

export default async function CariRedirect() {
  const locale = (await getLocale()) as Locale
  redirect(withLocale('/jelajah', locale))
}

import type { Locale } from '@/i18n/routing'
import { withLocale } from '@/lib/i18n/locale-path'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

/** Paspor global → default desa thin-slice PkM. */
export default async function PasporRedirectPage() {
  const locale = (await getLocale()) as Locale
  redirect(withLocale('/teluk-kiluan/paspor', locale))
}

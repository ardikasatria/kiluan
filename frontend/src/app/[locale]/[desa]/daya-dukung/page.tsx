import type { Locale } from '@/i18n/routing'
import { withLocale } from '@/lib/i18n/locale-path'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function DayaDukungRedirectPage({ params }: Props) {
  const { desa } = await params
  const locale = (await getLocale()) as Locale
  redirect(withLocale(`/${desa}/lestari/daya-dukung`, locale))
}

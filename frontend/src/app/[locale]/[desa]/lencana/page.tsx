import { redirect } from '@/i18n/navigation'
import { getLocale } from 'next-intl/server'

interface Props {
  params: Promise<{ desa: string }>
}

/** Alias lama → halaman lencana pribadi (F5). */
export default async function LencanaRedirectPage({ params }: Props) {
  const { desa } = await params
  const locale = await getLocale()
  redirect({ href: `/${desa}/saya/lencana`, locale })
}

import AkunPreferensiClient from '@/components/kiluan/akun/AkunPreferensiClient'
import { metadataPrivat } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('akun.seo')
  return metadataPrivat(t('title'), 'sigerciv', '/saya/akun', t('description'))
}

export default function AkunGlobalPage() {
  return <AkunPreferensiClient lintasDesa />
}

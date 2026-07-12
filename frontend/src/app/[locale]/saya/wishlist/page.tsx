import WishlistClient from '@/components/kiluan/simpanan/WishlistClient'
import { metadataPrivat } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('wishlist.seo')
  return metadataPrivat(t('title'), 'sigerciv', '/saya/wishlist', t('description'))
}

export default function WishlistGlobalPage() {
  return <WishlistClient lintasDesa />
}

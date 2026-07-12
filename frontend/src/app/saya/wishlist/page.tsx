import WishlistClient from '@/components/kiluan/simpanan/WishlistClient'
import { metadataPrivat } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'

export const metadata: Metadata = metadataPrivat(
  'Wishlist saya',
  'sigerciv',
  '/saya/wishlist',
  'Destinasi, paket wisata, dan misi lestari yang Anda simpan di Sigerciv.',
)

export default function WishlistGlobalPage() {
  return <WishlistClient lintasDesa />
}

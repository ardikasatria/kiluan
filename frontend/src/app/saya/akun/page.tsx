import AkunPreferensiClient from '@/components/kiluan/akun/AkunPreferensiClient'
import { metadataPrivat } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'

export const metadata: Metadata = metadataPrivat(
  'Akun & Preferensi',
  'sigerciv',
  '/saya/akun',
  'Kelola profil, keamanan, keanggotaan, dan preferensi pribadi Anda di Sigerciv.',
)

export default function AkunGlobalPage() {
  return <AkunPreferensiClient lintasDesa />
}

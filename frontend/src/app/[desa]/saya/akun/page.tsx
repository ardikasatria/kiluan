import AkunPreferensiClient from '@/components/kiluan/akun/AkunPreferensiClient'
import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataPrivat } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return metadataPrivat(
    profil ? `Akun & Preferensi — ${profil.nama}` : 'Akun & Preferensi',
    desa,
    '/saya/akun',
    'Kelola profil, keamanan, keanggotaan, dan preferensi pribadi Anda di Sigerciv.',
  )
}

export default async function AkunPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <DasborGuard desaSlug={desa} loginOnly>
      <AkunPreferensiClient desaSlug={desa} desaNama={profil.nama} />
    </DasborGuard>
  )
}

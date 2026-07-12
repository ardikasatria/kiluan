import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import NaikKelasClient from '@/components/kiluan/naik-kelas/NaikKelasClient'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataHalamanPublik } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return metadataHalamanPublik(desa, 'naik-kelas', profil?.nama ?? undefined) ?? { title: 'naik-kelas' }
}

export default async function NaikKelasPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <DasborGuard desaSlug={desa} loginOnly>
      <NaikKelasClient desaSlug={desa} desaNama={profil.nama} />
    </DasborGuard>
  )
}

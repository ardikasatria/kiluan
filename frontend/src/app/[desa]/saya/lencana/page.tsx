import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import LencanaSayaClient from '@/components/kiluan/lencana/LencanaSayaClient'
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
    profil ? `Lencana Warga — ${profil.nama}` : 'Lencana Warga',
    desa,
    '/saya/lencana',
    'Saldo poin dan koleksi lencana.',
  )
}

export default async function LencanaSayaPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <DasborGuard desaSlug={desa} loginOnly>
      <LencanaSayaClient desaSlug={desa} desaNama={profil.nama} />
    </DasborGuard>
  )
}

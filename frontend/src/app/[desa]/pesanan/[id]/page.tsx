import PesananClient from '@/components/kiluan/dermaga/PesananClient'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataPrivat } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, id } = await params
  const profil = await getProfilDesa(desa)
  return metadataPrivat(
    profil ? `Pesanan — ${profil.nama}` : 'Pesanan',
    desa,
    `/pesanan/${id}`,
    'Detail pesanan wisata Anda.',
  )
}

export default async function PesananPage({ params }: Props) {
  const { desa, id } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return <PesananClient desaSlug={desa} pesananId={id} />
}

import StasiunClient from '@/components/kiluan/penjelajah/StasiunClient'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return { title: profil ? `Stasiun Lestari — ${profil.nama}` : 'Stasiun Lestari' }
}

export default async function StasiunPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <StasiunClient desaSlug={desa} desaNama={profil.nama} />
}

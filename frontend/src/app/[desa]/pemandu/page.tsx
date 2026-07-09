import PemanduClient from '@/components/kiluan/pemandu/PemanduClient'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return { title: profil ? `Pemandu — ${profil.nama}` : 'Pemandu Wisata' }
}

export default async function PemanduPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <PemanduClient desaSlug={desa} desaNama={profil.nama} />
}

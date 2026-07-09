import PasporClient from '@/components/kiluan/penjelajah/PasporClient'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return { title: profil ? `Paspor Lestari — ${profil.nama}` : 'Paspor Lestari' }
}

export default async function PasporDesaPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <PasporClient desaSlug={desa} desaNama={profil.nama} />
}

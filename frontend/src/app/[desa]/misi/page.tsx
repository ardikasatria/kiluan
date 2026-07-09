import MisiClient from '@/components/kiluan/penjelajah/MisiClient'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return { title: profil ? `Misi Kiluan — ${profil.nama}` : 'Misi Kiluan' }
}

export default async function MisiPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <MisiClient desaSlug={desa} desaNama={profil.nama} />
}

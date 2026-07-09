import TukarPoinClient from '@/components/kiluan/poin/TukarPoinClient'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return { title: profil ? `Tukar Poin — ${profil.nama}` : 'Tukar Poin' }
}

export default async function TukarPoinPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <TukarPoinClient desaSlug={desa} desaNama={profil.nama} />
}

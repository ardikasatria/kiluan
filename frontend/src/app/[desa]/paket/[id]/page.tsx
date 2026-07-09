import PaketDetailClient from '@/components/kiluan/pasar/PaketDetailClient'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return { title: profil ? `Detail paket — ${profil.nama}` : 'Detail paket' }
}

export default async function PaketDetailPage({ params }: Props) {
  const { desa, id } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return <PaketDetailClient desaSlug={desa} paketIdOrSlug={id} />
}

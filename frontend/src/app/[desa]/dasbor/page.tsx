import DasborEntry from '@/components/kiluan/dashboard/DasborEntry'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return { title: profil ? `Dasbor — ${profil.nama}` : 'Dasbor' }
}

export default async function DasborHubPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return <DasborEntry desaSlug={desa} profilNama={profil.nama} />
}

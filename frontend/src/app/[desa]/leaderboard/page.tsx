import LeaderboardClient from '@/components/kiluan/lencana/LeaderboardClient'
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
  return metadataHalamanPublik(desa, 'leaderboard', profil?.nama ?? undefined) ?? { title: 'leaderboard' }
}

export default async function LeaderboardPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return <LeaderboardClient desaSlug={desa} desaNama={profil.nama} />
}

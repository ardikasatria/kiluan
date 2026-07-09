import LeaderboardClient from '@/components/kiluan/lencana/LeaderboardClient'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return {
    title: profil ? `Leaderboard — ${profil.nama}` : 'Leaderboard',
    description: 'Papan peringkat partisipasi regeneratif per desa.',
  }
}

export default async function LeaderboardPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return <LeaderboardClient desaSlug={desa} desaNama={profil.nama} />
}

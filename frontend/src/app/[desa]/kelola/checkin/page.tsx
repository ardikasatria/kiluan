import CheckinClient from '@/components/kiluan/dermaga/CheckinClient'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export const metadata: Metadata = { title: 'Check-in booking' }

export default async function CheckinPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return <CheckinClient desaSlug={desa} />
}

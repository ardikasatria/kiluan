import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import KontribusiSayaClient from '@/components/kiluan/kontribusi/KontribusiSayaClient'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return { title: profil ? `Kontribusi — ${profil.nama}` : 'Kontribusi' }
}

export default async function KontribusiPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <DasborGuard desaSlug={desa} loginOnly>
      <KontribusiSayaClient desaSlug={desa} desaNama={profil.nama} />
    </DasborGuard>
  )
}

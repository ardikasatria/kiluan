import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import PaketKelolaClient from '@/components/kiluan/pasar/PaketKelolaClient'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return { title: profil ? `Paket Wisata — ${profil.nama}` : 'Paket Wisata' }
}

export default async function AgenPaketPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <DasborGuard desaSlug={desa} peran="agen">
      <PaketKelolaClient desaSlug={desa} desaNama={profil.nama} />
    </DasborGuard>
  )
}

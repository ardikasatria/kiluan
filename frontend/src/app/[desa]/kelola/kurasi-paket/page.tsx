import PengelolaGuard from '@/components/kiluan/PengelolaGuard'
import KurasiPaketClient from '@/components/kiluan/pasar/KurasiPaketClient'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return { title: profil ? `Kurasi Paket — ${profil.nama}` : 'Kurasi Paket' }
}

export default async function KurasiPaketPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <PengelolaGuard desaSlug={desa}>
      <KurasiPaketClient desaSlug={desa} desaNama={profil.nama} />
    </PengelolaGuard>
  )
}

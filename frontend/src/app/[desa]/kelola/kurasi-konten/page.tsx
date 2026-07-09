import PengelolaGuard from '@/components/kiluan/PengelolaGuard'
import KurasiKontenClient from '@/components/kiluan/kontribusi/KurasiKontenClient'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return { title: profil ? `Kurasi Konten — ${profil.nama}` : 'Kurasi Konten' }
}

export default async function KurasiKontenPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <PengelolaGuard desaSlug={desa}>
      <KurasiKontenClient desaSlug={desa} desaNama={profil.nama} />
    </PengelolaGuard>
  )
}

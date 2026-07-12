import KuponDompetClient from '@/components/kiluan/poin/KuponDompetClient'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataPrivat } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return metadataPrivat(
    profil ? `Kupon Saya — ${profil.nama}` : 'Kupon Saya',
    desa,
    '/kupon',
    'Dompet kupon diskon Anda.',
  )
}

export default async function KuponPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <KuponDompetClient desaSlug={desa} desaNama={profil.nama} />
}

import PaketDetailClient from '@/components/kiluan/pasar/PaketDetailClient'
import { getProfilDesa } from '@/lib/api/desa'
import { getPaketDetail } from '@/lib/api/pasar'
import { metadataDesa } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, id } = await params
  const [profil, paket] = await Promise.all([
    getProfilDesa(desa),
    getPaketDetail(desa, id).catch(() => null),
  ])
  return metadataDesa({
    judul: paket?.nama ?? 'Detail Paket',
    desaSlug: desa,
    desaNama: profil?.nama,
    path: `/paket/${paket?.slug ?? id}`,
    deskripsi: paket?.deskripsi ?? `Paket wisata di ${profil?.nama ?? desa}.`,
  })
}

export default async function PaketDetailPage({ params }: Props) {
  const { desa, id } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return <PaketDetailClient desaSlug={desa} paketIdOrSlug={id} />
}

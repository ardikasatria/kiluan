import UmkmDetailClient from '@/components/kiluan/pasar/UmkmDetailClient'
import { getProfilDesa } from '@/lib/api/desa'
import { getDetailUmkm } from '@/lib/api/pasar'
import { metadataDesa } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, id } = await params
  const t = await getTranslations('pasar.umkmDetail')
  const [profil, umkm] = await Promise.all([
    getProfilDesa(desa),
    getDetailUmkm(desa, id).catch(() => null),
  ])
  return metadataDesa({
    judul: umkm?.nama ?? t('seoFallback'),
    desaSlug: desa,
    desaNama: profil?.nama,
    path: `/pasar/umkm/${id}`,
    deskripsi: umkm?.deskripsi ?? t('seoDesc', { desa: profil?.nama ?? desa }),
  })
}

export default async function UmkmDetailPage({ params }: Props) {
  const { desa, id } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return <UmkmDetailClient desaSlug={desa} umkmId={id} />
}

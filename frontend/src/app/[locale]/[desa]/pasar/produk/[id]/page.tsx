import ProdukDetailClient from '@/components/kiluan/pasar/ProdukDetailClient'
import { getProfilDesa } from '@/lib/api/desa'
import { getDetailProduk } from '@/lib/api/pasar'
import { metadataDesa } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, id } = await params
  const t = await getTranslations('pasar.produkDetail')
  const [profil, produk] = await Promise.all([
    getProfilDesa(desa),
    getDetailProduk(desa, id).catch(() => null),
  ])
  return metadataDesa({
    judul: produk?.nama ?? t('seoFallback'),
    desaSlug: desa,
    desaNama: profil?.nama,
    path: `/pasar/produk/${id}`,
    deskripsi: produk?.deskripsi ?? t('seoDesc', { desa: profil?.nama ?? desa }),
  })
}

export default async function ProdukDetailPage({ params }: Props) {
  const { desa, id } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return <ProdukDetailClient desaSlug={desa} produkId={id} />
}

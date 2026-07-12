import PesananClient from '@/components/kiluan/dermaga/PesananClient'
import { getProfilDesa } from '@/lib/api/desa'
import { buatMetadata } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, id } = await params
  const profil = await getProfilDesa(desa)
  const t = await getTranslations('pesanan')
  return buatMetadata({
    judul: profil ? t('seo.titleDesa', { desa: profil.nama }) : t('seo.title'),
    deskripsi: t('seo.description'),
    path: `/${desa}/pesanan/${id}`,
    noindex: true,
  })
}

export default async function PesananPage({ params }: Props) {
  const { desa, id } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return <PesananClient desaSlug={desa} pesananId={id} />
}

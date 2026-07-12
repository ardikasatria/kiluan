import StasiunClient from '@/components/kiluan/penjelajah/StasiunClient'
import { getProfilDesa } from '@/lib/api/desa'
import { buatMetadata } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  const t = await getTranslations('stasiunLestari')
  return buatMetadata({
    judul: profil ? t('seoTitleDesa', { desa: profil.nama }) : t('seoTitle'),
    deskripsi: t('subtitle'),
    path: `/${desa}/stasiun-lestari`,
  })
}

export default async function StasiunPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <StasiunClient desaSlug={desa} desaNama={profil.nama} />
}

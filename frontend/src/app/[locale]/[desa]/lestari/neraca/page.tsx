import NeracaLestariClient from '@/components/kiluan/lestari/NeracaLestariClient'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataHalamanPublik } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  const t = await getTranslations('lestari.neraca')
  return metadataHalamanPublik(desa, 'lestari/neraca', profil?.nama ?? undefined) ?? { title: t('title') }
}

export default async function NeracaLestariPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <NeracaLestariClient desaSlug={desa} desaNama={profil.nama} />
}

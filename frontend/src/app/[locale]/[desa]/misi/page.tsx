import MisiClient from '@/components/kiluan/penjelajah/MisiClient'
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
  const t = await getTranslations('misi')
  return metadataHalamanPublik(desa, 'misi', profil?.nama ?? undefined) ?? { title: t('seoTitle') }
}

export default async function MisiPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <MisiClient desaSlug={desa} desaNama={profil.nama} />
}

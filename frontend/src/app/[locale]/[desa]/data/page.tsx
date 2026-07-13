import DataDashboardClient from '@/components/kiluan/anjungan/DataDashboardClient'
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
  const t = await getTranslations('anjungan.dashboard')
  return metadataHalamanPublik(desa, 'data', profil?.nama ?? undefined) ?? { title: t('title') }
}

export default async function DataPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <DataDashboardClient desaSlug={desa} desaNama={profil.nama} />
}

import MonitoringCatatClient from '@/components/kiluan/lestari/MonitoringCatatClient'
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
  const t = await getTranslations('lestari.monitoring')
  return metadataHalamanPublik(desa, 'lestari/monitoring/catat', profil?.nama ?? undefined) ?? { title: t('catatTitle') }
}

export default async function MonitoringCatatPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <MonitoringCatatClient desaSlug={desa} desaNama={profil.nama} />
}

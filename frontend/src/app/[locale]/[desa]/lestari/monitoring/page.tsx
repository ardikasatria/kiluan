import MonitoringDaftarClient from '@/components/kiluan/lestari/MonitoringDaftarClient'
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
  return metadataHalamanPublik(desa, 'lestari/monitoring', profil?.nama ?? undefined) ?? { title: t('listTitle') }
}

export default async function MonitoringDaftarPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <MonitoringDaftarClient desaSlug={desa} desaNama={profil.nama} />
}

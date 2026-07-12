import PemanduClient from '@/components/kiluan/pemandu/PemanduClient'
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
  const t = await getTranslations('pemandu')
  return metadataHalamanPublik(desa, 'pemandu', profil?.nama ?? undefined) ?? { title: t('seoTitle') }
}

export default async function PemanduPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <PemanduClient desaSlug={desa} desaNama={profil.nama} />
}

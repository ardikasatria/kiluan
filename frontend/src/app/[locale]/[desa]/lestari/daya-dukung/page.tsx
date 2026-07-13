import DayaDukungClient from '@/components/kiluan/lestari/DayaDukungClient'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataKelola } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const t = await getTranslations('lestari.dayaDukung')
  const profil = await getProfilDesa(desa)
  return metadataKelola(
    profil ? `${t('title')} — ${profil.nama}` : t('title'),
    desa,
  )
}

export default async function DayaDukungPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <DayaDukungClient desaSlug={desa} desaNama={profil.nama} />
}

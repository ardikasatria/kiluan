import DanaCatatClient from '@/components/kiluan/lestari/DanaCatatClient'
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
  const t = await getTranslations('lestari.dana')
  const profil = await getProfilDesa(desa)
  return metadataKelola(
    profil ? t('catatTitle') + ` — ${profil.nama}` : t('catatTitle'),
    desa,
  )
}

export default async function DanaCatatPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <DanaCatatClient desaSlug={desa} desaNama={profil.nama} />
}

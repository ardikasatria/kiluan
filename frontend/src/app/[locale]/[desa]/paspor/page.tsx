import PasporClient from '@/components/kiluan/penjelajah/PasporClient'
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
  const [profil, t] = await Promise.all([getProfilDesa(desa), getTranslations('paspor')])
  return (
    metadataHalamanPublik(desa, 'paspor', profil?.nama ?? undefined) ?? {
      title: t('seoTitle'),
      description: t('seoDesc'),
    }
  )
}

export default async function PasporDesaPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  return <PasporClient desaSlug={desa} desaNama={profil.nama} />
}

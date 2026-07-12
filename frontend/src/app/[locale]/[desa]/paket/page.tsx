import PaketDesaClient from '@/components/kiluan/pasar/PaketDesaClient'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataHalamanPublik } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  const t = await getTranslations('paket')
  return metadataHalamanPublik(desa, 'paket', profil?.nama ?? undefined) ?? { title: t('seoTitle') }
}

export default async function PaketPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  const t = await getTranslations('paket')

  return (
    <Suspense fallback={<p className="container py-16 text-center text-sm text-neutral-500">{t('loading')}</p>}>
      <PaketDesaClient desaSlug={desa} desaNama={profil.nama} />
    </Suspense>
  )
}

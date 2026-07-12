import CheckoutClient from '@/components/kiluan/dermaga/CheckoutClient'
import { getProfilDesa } from '@/lib/api/desa'
import { buatMetadata } from '@/lib/kiluan/seo'
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
  const t = await getTranslations('checkout')
  return buatMetadata({
    judul: profil ? t('seoTitleDesa', { desa: profil.nama }) : t('seoTitle'),
    deskripsi: t('seoDesc'),
    path: `/${desa}/checkout`,
    noindex: true,
  })
}

export default async function CheckoutPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  const t = await getTranslations('checkout')

  return (
    <Suspense fallback={<p className="container py-16 text-center text-sm">{t('loading')}</p>}>
      <CheckoutClient desaSlug={desa} desaNama={profil.nama} />
    </Suspense>
  )
}

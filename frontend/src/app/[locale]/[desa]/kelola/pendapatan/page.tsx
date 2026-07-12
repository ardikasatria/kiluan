import PendapatanClient from '@/components/kiluan/dermaga/PendapatanClient'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataKelola } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const t = await getTranslations('kelola.pendapatan')
  const profil = await getProfilDesa(desa)
  return metadataKelola(
    profil ? t('seoTitleDesa', { desa: profil.nama }) : t('seoTitle'),
    desa,
  )
}

export default async function PendapatanPage({ params }: Props) {
  const { desa } = await params
  const t = await getTranslations('kelola.pendapatan')
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{t('eyebrow')}</p>
        <h2 className="mt-1 text-xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {t('subtitleDesa', { desa: profil.nama })}
        </p>
      </div>
      <PendapatanClient desaSlug={desa} mode="pengelola" />
    </div>
  )
}

import VerifikasiMonitoringClient from '@/components/kiluan/lestari/VerifikasiMonitoringClient'
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
  const t = await getTranslations('lestari.verifikasi')
  const profil = await getProfilDesa(desa)
  return metadataKelola(
    profil ? t('seoTitleDesa', { desa: profil.nama }) : t('seoTitle'),
    desa,
  )
}

export default async function VerifikasiMonitoringKelolaPage({ params }: Props) {
  const { desa } = await params
  const t = await getTranslations('lestari.verifikasi')
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
      <VerifikasiMonitoringClient desaSlug={desa} />
    </div>
  )
}

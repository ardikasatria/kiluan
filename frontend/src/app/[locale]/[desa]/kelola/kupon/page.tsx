import KelolaKuponClient from '@/components/kiluan/poin/KelolaKuponClient'
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
  const t = await getTranslations('kelola.kupon')
  return metadataKelola(t('seo.campaign'), desa)
}

export default async function KelolaKuponPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  const t = await getTranslations('kelola.kupon')
  if (!profil) notFound()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{t('eyebrow')}</p>
        <h2 className="mt-1 text-xl font-bold text-primary-800 dark:text-primary-100">{t('campaignHeading')}</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t('campaignSubtitle', { desa: profil.nama })}</p>
      </div>
      <KelolaKuponClient desaSlug={desa} mode="kampanye" />
    </div>
  )
}

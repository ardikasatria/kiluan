import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import KelolaKuponClient from '@/components/kiluan/poin/KelolaKuponClient'
import { getProfilDesa } from '@/lib/api/desa'
import { buatMetadata } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const t = await getTranslations('kelola.kupon')
  return buatMetadata({
    judul: t('seo.owner'),
    deskripsi: t('ownerSubtitle'),
    path: `/${desa}/saya/kupon-promo`,
    noindex: true,
  })
}

export default async function KuponPromoOwnerPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  const t = await getTranslations('kelola.kupon')
  if (!profil) notFound()

  return (
    <div className="container py-10 sm:py-12">
      <DasborGuard desaSlug={desa} desaNama={profil.nama} peran="umkm" redirectAfterLogin={`/${desa}/saya/kupon-promo`}>
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{profil.nama}</p>
            <h1 className="mt-1 text-2xl font-bold text-primary-800 dark:text-primary-100">{t('ownerHeading')}</h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{t('ownerSubtitle')}</p>
          </div>
          <KelolaKuponClient desaSlug={desa} mode="promo_owner" />
        </div>
      </DasborGuard>
    </div>
  )
}

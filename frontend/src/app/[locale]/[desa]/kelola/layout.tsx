import KelolaNav from '@/components/kiluan/KelolaNav'
import OfflineIndicator from '@/components/kiluan/OfflineIndicator'
import PengelolaGuard from '@/components/kiluan/PengelolaGuard'
import { Link } from '@/i18n/navigation'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataKelola } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  children: React.ReactNode
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const t = await getTranslations('kelola')
  return metadataKelola(t('seoTitle'), desa)
}

/** Header/footer situs dari [desa]/layout (ApplicationLayout) — di sini shell Pengelola Desa + nav tab. */
export default async function KelolaLayout({ children, params }: Props) {
  const { desa } = await params
  const t = await getTranslations('kelola')
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  const desaNama = profil.nama

  return (
    <PengelolaGuard desaSlug={desa}>
      <div className="container py-8 sm:py-12">
        <nav
          aria-label={t('shell.breadcrumbLabel')}
          className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400"
        >
          <Link href="/" className="hover:text-primary-700 dark:hover:text-primary-300">
            {t('shell.breadcrumbHome')}
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/${desa}`} className="hover:text-primary-700 dark:hover:text-primary-300">
            {desaNama}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{t('shell.breadcrumbKelola')}</span>
        </nav>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100">{t('layoutTitle')}</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {t('layoutSubtitle', { desa: desaNama })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/${desa}`}
                className="inline-flex rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-primary-300 hover:text-primary-800 dark:border-neutral-600 dark:text-neutral-300 dark:hover:border-primary-600 dark:hover:text-primary-200"
              >
                {t('shell.backEtalase')}
              </Link>
              <Link
                href={`/${desa}/dasbor/pokdarwis`}
                className="inline-flex rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-primary-300 hover:text-primary-800 dark:border-neutral-600 dark:text-neutral-300 dark:hover:border-primary-600 dark:hover:text-primary-200"
              >
                {t('shell.backDasbor')}
              </Link>
            </div>
          </div>
          <OfflineIndicator desaSlug={desa} />
        </div>
        <KelolaNav desaSlug={desa} />
        <div className="mt-8">{children}</div>
      </div>
    </PengelolaGuard>
  )
}

'use client'

import KelolaLayananClient from '@/components/kiluan/KelolaLayananClient'
import { useAuth } from '@/contexts/AuthProvider'
import { Link } from '@/i18n/navigation'
import type { LayananItem } from '@/lib/api/types'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'

interface Props {
  desaSlug: string
  desaNama: string
  awal: LayananItem[]
}

export default function AgenLayananKelolaClient({ desaSlug, desaNama, awal }: Props) {
  const t = useTranslations('pasar.agenLayanan')
  const { user, isLoading } = useAuth()

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container py-8">
          <Link
            href={`/${desaSlug}/dasbor/agen`}
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            <ArrowLeftIcon className="size-4" /> {t('backDashboard')}
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{desaNama}</p>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>

          <nav className="mt-4 flex flex-wrap gap-2" aria-label={t('subnavLabel')}>
            <Link
              href={`/${desaSlug}/saya/paket`}
              className="rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-600 hover:border-primary-400 dark:border-neutral-600 dark:text-neutral-400"
            >
              {t('tabPaket')}
            </Link>
            <span
              className={clsx(
                'rounded-full px-3 py-1 text-sm font-medium',
                'bg-primary-700 text-white dark:bg-primary-600',
              )}
              aria-current="page"
            >
              {t('tabLayanan')}
            </span>
          </nav>
        </div>
      </div>

      <div className="container py-8">
        {isLoading ? (
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        ) : !user ? (
          <p className="text-sm text-neutral-500">{t('butuhMasuk')}</p>
        ) : (
          <KelolaLayananClient
            desaSlug={desaSlug}
            awal={awal}
            mode="pemilik"
            penyediaId={user.id}
            introKey="pemilikIntroAgen"
          />
        )}
      </div>
    </div>
  )
}

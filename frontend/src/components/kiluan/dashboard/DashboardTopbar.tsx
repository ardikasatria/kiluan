'use client'

import { RUTE_DASBOR } from '@/lib/kiluan/rute-sigerciv'
import type { DashboardPeranConfig } from '@/lib/kiluan/dashboard-peran'
import { labelPeran } from '@/lib/kiluan/peran'
import { Link } from '@/i18n/navigation'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'
import DashboardContextSwitcher from './DashboardContextSwitcher'

interface Props {
  desaSlug: string
  desaNama: string
  config: DashboardPeranConfig
  sectionTitle?: string
  onOpenNav?: () => void
  lintasDesa?: boolean
}

export default function DashboardTopbar({
  desaSlug,
  desaNama,
  config,
  sectionTitle,
  onOpenNav,
  lintasDesa = false,
}: Props) {
  const t = useTranslations('dasbor.view')
  const tPeran = useTranslations('peran')
  const judulBagian = sectionTitle ?? t('ringkasan')
  const dasborLink = lintasDesa ? RUTE_DASBOR : `/${desaSlug}/dasbor`
  const tampilkanSwitcher = !lintasDesa && config.kode !== 'wisatawan'

  return (
    <header className="-mx-4 border-b border-neutral-200/80 bg-neutral-50/80 px-4 py-3 sm:-mx-6 sm:px-6 dark:border-neutral-800/80 dark:bg-neutral-900/50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {onOpenNav && (
            <button
              type="button"
              onClick={onOpenNav}
              aria-controls="dashboard-mobile-nav"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 lg:hidden dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Bars3Icon className="size-5" aria-hidden />
              <span className="sr-only">{t('bukaNav')}</span>
            </button>
          )}
          <div className="min-w-0">
            <nav className="text-xs text-neutral-500 dark:text-neutral-400" aria-label="Breadcrumb">
              <Link href={dasborLink} className="hover:text-primary-600 dark:hover:text-primary-400">
                {t('dasbor')}
              </Link>
              <span className="mx-1.5">/</span>
              <span className="text-neutral-700 dark:text-neutral-300">{labelPeran(config.kode, tPeran)}</span>
              {judulBagian !== t('ringkasan') && (
                <>
                  <span className="mx-1.5">/</span>
                  <span className="font-medium text-primary-800 dark:text-primary-100">{judulBagian}</span>
                </>
              )}
            </nav>
            <h2 className="truncate text-lg font-bold text-primary-800 sm:text-xl dark:text-primary-100">
              {judulBagian}
            </h2>
          </div>
        </div>

        {tampilkanSwitcher ? (
          <DashboardContextSwitcher
            desaSlug={desaSlug}
            desaNama={desaNama}
            peranAktif={config.kode}
            className="w-full sm:w-auto sm:max-w-xs"
          />
        ) : null}
      </div>
    </header>
  )
}

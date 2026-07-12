'use client'

import DashboardShell from '@/components/kiluan/dashboard/DashboardShell'
import DashboardSidebar from '@/components/kiluan/dashboard/DashboardSidebar'
import DashboardTopbar from '@/components/kiluan/dashboard/DashboardTopbar'
import type { DashboardPeranConfig } from '@/lib/kiluan/dashboard-peran'
import { labelPeran, slugPeran } from '@/lib/kiluan/peran'
import { Link } from '@/i18n/navigation'
import { ClockIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
  config: DashboardPeranConfig
  sectionLabel: string
}

export default function DashboardSectionPlaceholder({ desaSlug, desaNama, config, sectionLabel }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const t = useTranslations('dasbor.placeholder')
  const tPeran = useTranslations('peran')
  const navItem = config.nav.find((n) => n.label === sectionLabel || n.id === sectionLabel)

  return (
    <DashboardShell
      sidebarOpen={sidebarOpen}
      sidebar={
        <DashboardSidebar desaSlug={desaSlug} peran={config.kode} nav={config.nav} tagline={config.tagline} />
      }
      topbar={
        <DashboardTopbar
          desaSlug={desaSlug}
          desaNama={desaNama}
          config={config}
          sectionTitle={navItem?.label ?? sectionLabel}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
      }
    >
      <div className="rounded-2xl border border-dashed border-amber-300/60 bg-amber-50/40 p-8 text-center dark:border-amber-700/40 dark:bg-amber-950/20 sm:p-10">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <ClockIcon className="size-7" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-primary-800 dark:text-primary-100">
          {navItem?.label ?? sectionLabel}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {t('desc', { peran: labelPeran(config.kode, tPeran) })}
        </p>
        {navItem?.segera && (
          <p className="mx-auto mt-3 max-w-sm text-xs font-medium text-amber-800 dark:text-amber-300">
            {t('segeraNote', { modul: (navItem.label ?? sectionLabel).toLowerCase() })}
          </p>
        )}
        <Link
          href={`/${desaSlug}/dasbor/${slugPeran(config.kode)}`}
          className="mt-6 inline-block text-sm font-semibold text-primary-700 hover:text-primary-600 dark:text-primary-300"
        >
          {t('kembali')}
        </Link>
      </div>
    </DashboardShell>
  )
}

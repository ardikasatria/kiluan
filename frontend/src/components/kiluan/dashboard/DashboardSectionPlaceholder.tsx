'use client'

import DashboardSidebar from '@/components/kiluan/dashboard/DashboardSidebar'
import type { DashboardPeranConfig } from '@/lib/kiluan/dashboard-peran'
import { labelPeran, slugPeran } from '@/lib/kiluan/peran'
import { BeakerIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface Props {
  desaSlug: string
  config: DashboardPeranConfig
  sectionLabel: string
}

export default function DashboardSectionPlaceholder({ desaSlug, config, sectionLabel }: Props) {
  const navItem = config.nav.find((n) => n.label === sectionLabel || n.id === sectionLabel)

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
      <DashboardSidebar desaSlug={desaSlug} peran={config.kode} nav={config.nav} tagline={config.tagline} />
      <div className="flex-1">
        <div className="rounded-2xl border border-dashed border-amber-300/60 bg-amber-50/50 p-8 text-center dark:border-amber-700/40 dark:bg-amber-950/20">
          <BeakerIcon className="mx-auto size-10 text-amber-600 dark:text-amber-400" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold text-primary-800 dark:text-primary-100">
            {navItem?.label ?? sectionLabel}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
            Bagian ini akan aktif pada integrasi API Fase {config.fase}. UI dasbor sudah disiapkan untuk{' '}
            {labelPeran(config.kode)}.
          </p>
          <Link
            href={`/${desaSlug}/dasbor/${slugPeran(config.kode)}`}
            className="mt-6 inline-block text-sm font-semibold text-primary-700 dark:text-primary-300"
          >
            ← Kembali ke ringkasan
          </Link>
        </div>
      </div>
    </div>
  )
}

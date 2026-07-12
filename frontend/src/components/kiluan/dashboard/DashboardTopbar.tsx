'use client'

import KiluanSearchModal from '@/components/kiluan/KiluanSearchModal'
import NotifyDropdown from '@/components/Header/NotifyDropdown'
import AvatarDropdown from '@/components/Header/AvatarDropdown'
import { RUTE_DASBOR } from '@/lib/kiluan/rute-sigerciv'
import type { DashboardPeranConfig } from '@/lib/kiluan/dashboard-peran'
import { labelPeran } from '@/lib/kiluan/peran'
import { Bars3Icon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import DashboardContextSwitcher from './DashboardContextSwitcher'

interface Props {
  desaSlug: string
  desaNama: string
  config: DashboardPeranConfig
  sectionTitle?: string
  onToggleSidebar?: () => void
  sidebarOpen?: boolean
  lintasDesa?: boolean
}

export default function DashboardTopbar({
  desaSlug,
  desaNama,
  config,
  sectionTitle = 'Ringkasan',
  onToggleSidebar,
  sidebarOpen,
  lintasDesa = false,
}: Props) {
  const dasborLink = lintasDesa ? RUTE_DASBOR : `/${desaSlug}/dasbor`

  return (
    <header className="sticky top-[72px] z-20 -mx-4 border-b border-neutral-200/80 bg-white/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-20 dark:border-neutral-800/80 dark:bg-neutral-900/90">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-expanded={sidebarOpen}
              aria-controls="dashboard-sidebar"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 lg:hidden dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Bars3Icon className="size-5" aria-hidden />
              <span className="sr-only">Buka navigasi dasbor</span>
            </button>
          )}
          <div className="min-w-0">
            <nav className="text-xs text-neutral-500 dark:text-neutral-400" aria-label="Breadcrumb">
              <Link href={dasborLink} className="hover:text-primary-600 dark:hover:text-primary-400">
                Dasbor
              </Link>
              <span className="mx-1.5">/</span>
              <span className="text-neutral-700 dark:text-neutral-300">{labelPeran(config.kode)}</span>
              {sectionTitle !== 'Ringkasan' && (
                <>
                  <span className="mx-1.5">/</span>
                  <span className="font-medium text-primary-800 dark:text-primary-100">{sectionTitle}</span>
                </>
              )}
            </nav>
            <h1 className="truncate text-lg font-bold text-primary-800 sm:text-xl dark:text-primary-100">
              {sectionTitle}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <KiluanSearchModal type="type1" />
          </div>
          {!lintasDesa && config.kode !== 'wisatawan' ? (
            <DashboardContextSwitcher
              desaSlug={desaSlug}
              desaNama={desaNama}
              peranAktif={config.kode}
              className="w-full sm:w-auto"
            />
          ) : null}
          <div className="flex items-center gap-1">
            <NotifyDropdown className="hidden sm:block" />
            <AvatarDropdown />
          </div>
        </div>
      </div>
    </header>
  )
}

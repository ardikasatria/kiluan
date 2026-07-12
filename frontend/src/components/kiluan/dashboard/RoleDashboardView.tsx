'use client'

import DashboardActivity from '@/components/kiluan/dashboard/DashboardActivity'
import DashboardModulLinks from '@/components/kiluan/dashboard/DashboardModulLinks'
import DashboardQuickActions from '@/components/kiluan/dashboard/DashboardQuickActions'
import DashboardShell from '@/components/kiluan/dashboard/DashboardShell'
import DashboardSidebar from '@/components/kiluan/dashboard/DashboardSidebar'
import DashboardStatGrid from '@/components/kiluan/dashboard/DashboardStatGrid'
import DashboardTopbar from '@/components/kiluan/dashboard/DashboardTopbar'
import DashboardWidgetGrid from '@/components/kiluan/dashboard/DashboardWidgetGrid'
import type { DashboardPeranConfig } from '@/lib/kiluan/dashboard-peran'
import { BeakerIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
  config: DashboardPeranConfig
  statsOverride?: Partial<Record<string, string | number>>
  sectionTitle?: string
  /** Dasbor wisatawan / pengguna lintas desa */
  lintasDesa?: boolean
}

export default function RoleDashboardView({
  desaSlug,
  desaNama,
  config,
  statsOverride,
  sectionTitle = 'Ringkasan',
  lintasDesa = false,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const stats = config.stats.map((s) => ({
    ...s,
    value: statsOverride?.[s.id] ?? s.value,
  }))

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
          sectionTitle={sectionTitle}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          lintasDesa={lintasDesa}
        />
      }
    >
      <div className="space-y-8">
        <div className="rounded-2xl border border-primary-200/60 bg-gradient-to-br from-kiluan-mint/15 via-white to-primary-50/50 p-5 dark:border-primary-800/40 dark:from-primary-950/40 dark:via-neutral-900/60 dark:to-kiluan-navy/20 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-kiluan-mint/30 px-2.5 py-0.5 text-xs font-semibold text-primary-800 dark:bg-primary-900/60 dark:text-kiluan-mint">
              Fase {config.fase}
            </span>
            {stats.some((s) => s.value === '—' || s.segera) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                <BeakerIcon className="size-3.5" aria-hidden />
                Beberapa fitur menyusul
              </span>
            )}
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {config.deskripsi}
          </p>
        </div>

        <section>
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Ringkasan</h2>
          <DashboardStatGrid stats={stats} />
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Modul peran</h2>
          <DashboardWidgetGrid widgets={config.widgets} />
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Aksi cepat</h2>
          <DashboardQuickActions actions={config.aksiCepat} />
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Aktivitas terbaru</h2>
            <DashboardActivity items={config.aktivitasContoh} />
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              Contoh aktivitas — feed nyata menyusul integrasi API.
            </p>
          </section>
          <section>
            <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Modul terkait</h2>
            <DashboardModulLinks modul={config.modulTerkait} />
          </section>
        </div>
      </div>
    </DashboardShell>
  )
}

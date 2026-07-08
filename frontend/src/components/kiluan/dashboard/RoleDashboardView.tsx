'use client'

import DashboardActivity from '@/components/kiluan/dashboard/DashboardActivity'
import DashboardModulLinks from '@/components/kiluan/dashboard/DashboardModulLinks'
import DashboardQuickActions from '@/components/kiluan/dashboard/DashboardQuickActions'
import DashboardSidebar from '@/components/kiluan/dashboard/DashboardSidebar'
import DashboardStatGrid from '@/components/kiluan/dashboard/DashboardStatGrid'
import type { DashboardPeranConfig } from '@/lib/kiluan/dashboard-peran'
import { labelPeran } from '@/lib/kiluan/peran'
import { BeakerIcon } from '@heroicons/react/24/outline'

interface Props {
  desaSlug: string
  config: DashboardPeranConfig
  statsOverride?: Partial<Record<string, string | number>>
}

export default function RoleDashboardView({ desaSlug, config, statsOverride }: Props) {
  const stats = config.stats.map((s) => ({
    ...s,
    value: statsOverride?.[s.id] ?? s.value,
  }))

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
      <DashboardSidebar
        desaSlug={desaSlug}
        peran={config.kode}
        nav={config.nav}
        tagline={config.tagline}
      />

      <div className="min-w-0 flex-1 space-y-8">
        <header className="lg:hidden">
          <p className="text-xs font-medium text-primary-600 uppercase dark:text-primary-400">Dasbor</p>
          <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100">{labelPeran(config.kode)}</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{config.deskripsi}</p>
        </header>

        <div className="hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-primary-50/80 to-white p-6 lg:block dark:border-neutral-700 dark:from-primary-950/40 dark:to-neutral-900/40">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-800 dark:bg-primary-900/60 dark:text-primary-200">
              Fase {config.fase}
            </span>
            {stats.some((s) => s.hint?.startsWith('Fase')) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                <BeakerIcon className="size-3.5" aria-hidden />
                Beberapa metrik menyusul
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
    </div>
  )
}

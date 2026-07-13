'use client'

import DashboardActivity, { type AktivitasDasborItem } from '@/components/kiluan/dashboard/DashboardActivity'
import DashboardModulLinks from '@/components/kiluan/dashboard/DashboardModulLinks'
import DashboardQuickActions from '@/components/kiluan/dashboard/DashboardQuickActions'
import DashboardStatGrid from '@/components/kiluan/dashboard/DashboardStatGrid'
import DashboardViewShell from '@/components/kiluan/dashboard/DashboardViewShell'
import DashboardWidgetGrid from '@/components/kiluan/dashboard/DashboardWidgetGrid'
import type { DashboardPeranConfig, DashboardWidget } from '@/lib/kiluan/dashboard-peran'
import { BeakerIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'

interface Props {
  desaSlug: string
  desaNama: string
  config: DashboardPeranConfig
  statsOverride?: Partial<Record<string, string | number>>
  widgetsOverride?: Partial<Record<string, Partial<DashboardWidget>>>
  aktivitas?: AktivitasDasborItem[]
  aktivitasKosong?: string
  aktivitasTanpaCatatan?: boolean
  sectionTitle?: string
  /** Dasbor wisatawan / pengguna lintas desa */
  lintasDesa?: boolean
}

export default function RoleDashboardView({
  desaSlug,
  desaNama,
  config,
  statsOverride,
  widgetsOverride,
  aktivitas,
  aktivitasKosong,
  aktivitasTanpaCatatan,
  sectionTitle,
  lintasDesa = false,
}: Props) {
  const t = useTranslations('dasbor.view')
  const judulBagian = sectionTitle ?? t('ringkasan')

  const stats = config.stats.map((s) => ({
    ...s,
    value: statsOverride?.[s.id] ?? s.value,
  }))

  const widgets = config.widgets.map((w) => ({
    ...w,
    ...widgetsOverride?.[w.id],
  }))

  return (
    <DashboardViewShell
      desaSlug={desaSlug}
      desaNama={desaNama}
      config={config}
      sectionTitle={judulBagian}
      lintasDesa={lintasDesa}
    >
      <div className="space-y-8">
        <div className="rounded-2xl border border-primary-200/60 bg-gradient-to-br from-kiluan-mint/15 via-white to-primary-50/50 p-5 dark:border-primary-800/40 dark:from-primary-950/40 dark:via-neutral-900/60 dark:to-kiluan-navy/20 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-kiluan-mint/30 px-2.5 py-0.5 text-xs font-semibold text-primary-800 dark:bg-primary-900/60 dark:text-kiluan-mint">
              {t('fase', { fase: config.fase })}
            </span>
            {stats.some((s) => s.value === '—' || s.segera) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                <BeakerIcon className="size-3.5" aria-hidden />
                {t('fiturMenyusul')}
              </span>
            )}
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {config.deskripsi}
          </p>
        </div>

        <section>
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t('ringkasan')}</h2>
          <DashboardStatGrid stats={stats} />
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t('modulPeran')}</h2>
          <DashboardWidgetGrid widgets={widgets} />
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t('aksiCepat')}</h2>
          <DashboardQuickActions actions={config.aksiCepat} />
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t('aktivitas')}</h2>
            <DashboardActivity
              items={aktivitas ?? config.aktivitasContoh.map((label, i) => ({ id: `contoh-${i}`, label }))}
              kosong={aktivitasKosong}
            />
            {!aktivitasTanpaCatatan ? (
              <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                {t('aktivitasNote')}
              </p>
            ) : null}
          </section>
          <section>
            <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t('modulTerkait')}</h2>
            <DashboardModulLinks modul={config.modulTerkait} />
          </section>
        </div>
      </div>
    </DashboardViewShell>
  )
}

'use client'

import DashboardActivity from '@/components/kiluan/dashboard/DashboardActivity'
import DashboardModulLinks from '@/components/kiluan/dashboard/DashboardModulLinks'
import DashboardQuickActions from '@/components/kiluan/dashboard/DashboardQuickActions'
import DashboardStatGrid from '@/components/kiluan/dashboard/DashboardStatGrid'
import DashboardViewShell from '@/components/kiluan/dashboard/DashboardViewShell'
import DashboardWidgetGrid from '@/components/kiluan/dashboard/DashboardWidgetGrid'
import DashboardZoneTabs from '@/components/kiluan/dashboard/DashboardZoneTabs'
import type {
  DashboardPeranConfig,
  DashboardQuickAction,
  DashboardStat,
  DashboardWidget,
  ZonaDasbor,
  ZonaDasborPengelola,
} from '@/lib/kiluan/dashboard-peran'
import type { PeranKode } from '@/lib/kiluan/peran'
import { BeakerIcon, BuildingLibraryIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
  config: DashboardPeranConfig
  peran: Extract<PeranKode, 'kontributor' | 'perangkat_desa'>
  statsOverride?: Partial<Record<string, string | number>>
}

const STAT_ZONA_KONTRIBUTOR: Record<string, ZonaDasborPengelola> = {
  total: 'saya',
  diterima: 'saya',
  publik: 'kelola',
  kontrib: 'kelola',
}

function filterZona<T extends { zona?: ZonaDasbor }>(items: T[], zona: ZonaDasbor): T[] {
  return items.filter((item) => item.zona === zona)
}

export default function PengelolaDesaDashboardView({
  desaSlug,
  desaNama,
  config,
  peran,
  statsOverride,
}: Props) {
  const t = useTranslations('dasbor.view')
  const tPengelola = useTranslations('dasbor.pengelola')
  const [zona, setZona] = useState<ZonaDasborPengelola>('saya')

  const tabsPengelola = useMemo(
    () => [
      { id: 'saya', label: tPengelola('zona.saya'), hint: tPengelola('zona.sayaHint') },
      { id: 'kelola', label: tPengelola('zona.kelola'), hint: tPengelola('zona.kelolaHint') },
    ],
    [tPengelola],
  )

  const stats: DashboardStat[] = useMemo(() => {
    const merged = config.stats.map((s) => ({
      ...s,
      value: statsOverride?.[s.id] ?? s.value,
    }))
    if (peran !== 'kontributor') return merged
    return merged.filter((s) => STAT_ZONA_KONTRIBUTOR[s.id] === zona)
  }, [config.stats, statsOverride, peran, zona])

  const widgets: DashboardWidget[] = useMemo(() => {
    const all = config.widgets
    if (peran !== 'kontributor') return all
    return filterZona(all, zona)
  }, [config.widgets, peran, zona])

  const aksiCepat: DashboardQuickAction[] = useMemo(() => {
    const all = config.aksiCepat
    if (peran !== 'kontributor') return all
    return filterZona(all, zona)
  }, [config.aksiCepat, peran, zona])

  const pendingKeanggotaan =
    typeof statsOverride?.anggota === 'number' ? statsOverride.anggota : undefined

  return (
    <DashboardViewShell desaSlug={desaSlug} desaNama={desaNama} config={config}>
      <div className="space-y-8">
        {peran === 'kontributor' ? (
          <div className="rounded-2xl border border-primary-200/60 bg-gradient-to-br from-kiluan-mint/15 via-white to-primary-50/50 p-5 dark:border-primary-800/40 dark:from-primary-950/40 dark:via-neutral-900/60 dark:to-kiluan-navy/20 sm:p-6">
            <div className="flex flex-wrap items-start gap-3">
              <SparklesIcon className="mt-0.5 size-5 shrink-0 text-primary-600 dark:text-kiluan-mint" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-kiluan-mint/30 px-2.5 py-0.5 text-xs font-semibold text-primary-800 dark:bg-primary-900/60 dark:text-kiluan-mint">
                    {t('fase', { fase: config.fase })}
                  </span>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {config.deskripsi}
                </p>
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{tPengelola('kontributor.hybrid')}</p>
              </div>
            </div>
            <div className="mt-5">
              <DashboardZoneTabs
                zona={zona}
                onZonaChange={(z) => setZona(z as ZonaDasborPengelola)}
                tabs={tabsPengelola}
                ariaLabel={tPengelola('zona.label')}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-primary-50/30 p-5 dark:border-slate-700/60 dark:from-slate-900/50 dark:via-neutral-900/60 dark:to-primary-950/20 sm:p-6">
            <div className="flex flex-wrap items-start gap-3">
              <BuildingLibraryIcon className="mt-0.5 size-5 shrink-0 text-slate-600 dark:text-slate-300" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    {tPengelola('perangkat.badge')}
                  </span>
                  <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/50 dark:text-primary-200">
                    {t('fase', { fase: config.fase })}
                  </span>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {config.deskripsi}
                </p>
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{tPengelola('perangkat.governance')}</p>
                {pendingKeanggotaan !== undefined && pendingKeanggotaan > 0 ? (
                  <p className="mt-3 inline-flex rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                    {tPengelola('perangkat.pendingKeanggotaan', { count: pendingKeanggotaan })}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {stats.some((s) => s.value === '—' || s.segera) && peran === 'kontributor' && zona === 'kelola' ? (
          <p className="inline-flex items-center gap-1 text-xs text-amber-800 dark:text-amber-200">
            <BeakerIcon className="size-3.5" aria-hidden />
            {t('fiturMenyusul')}
          </p>
        ) : null}

        <section>
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {peran === 'kontributor' ? tPengelola('zona.ringkasan', { zona: tPengelola(`zona.${zona}`) }) : t('ringkasan')}
          </h2>
          <DashboardStatGrid stats={stats} />
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {peran === 'kontributor' ? tPengelola('zona.modul', { zona: tPengelola(`zona.${zona}`) }) : tPengelola('perangkat.modulJudul')}
          </h2>
          <DashboardWidgetGrid widgets={widgets} />
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t('aksiCepat')}</h2>
          <DashboardQuickActions actions={aksiCepat} />
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t('aktivitas')}</h2>
            <DashboardActivity items={config.aktivitasContoh.map((label, i) => ({ id: `contoh-${i}`, label }))} />
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{t('aktivitasNote')}</p>
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

'use client'

import DashboardActivity, { type AktivitasDasborItem } from '@/components/kiluan/dashboard/DashboardActivity'
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
  ZonaDasborOrganisasi,
} from '@/lib/kiluan/dashboard-peran'
import {
  ambilDataDasborOrganisasi,
  type EventAktivitasOrganisasi,
} from '@/lib/kiluan/organisasi-stats'
import { useAuth } from '@/contexts/AuthProvider'
import { BeakerIcon, GlobeAmericasIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
  config: DashboardPeranConfig
  statsOverride?: Partial<Record<string, string | number>>
}

const STAT_ZONA: Record<string, ZonaDasborOrganisasi> = {
  monitoring: 'lapangan',
  indikator: 'lapangan',
  verifikasi: 'lapangan',
  neraca: 'program',
  dana: 'program',
  laporan: 'program',
}

const STATUS_MONITORING = ['menunggu_verifikasi', 'terverifikasi', 'ditolak'] as const

function filterZona<T extends { zona?: ZonaDasbor }>(items: T[], zona: ZonaDasborOrganisasi): T[] {
  return items.filter((item) => item.zona === zona)
}

function formatWaktuRelatif(iso: string, locale: string): string {
  const d = new Date(iso)
  const detik = Math.floor((Date.now() - d.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (detik < 60) return rtf.format(-detik, 'second')
  const menit = Math.floor(detik / 60)
  if (menit < 60) return rtf.format(-menit, 'minute')
  const jam = Math.floor(menit / 60)
  if (jam < 24) return rtf.format(-jam, 'hour')
  const hari = Math.floor(jam / 24)
  return rtf.format(-hari, 'day')
}

export default function OrganisasiDashboardView({
  desaSlug,
  desaNama,
  config,
  statsOverride: statsServer,
}: Props) {
  const { isLoggedIn, isLoading: authLoading } = useAuth()
  const locale = useLocale()
  const t = useTranslations('dasbor.view')
  const tOrg = useTranslations('dasbor.organisasi')
  const tFeed = useTranslations('dasbor.organisasi.aktivitasFeed')
  const tMon = useTranslations('lestari.monitoring.status')

  const [zona, setZona] = useState<ZonaDasborOrganisasi>('lapangan')
  const [statsLive, setStatsLive] = useState<Partial<Record<string, string | number>> | undefined>()
  const [widgetsOverride, setWidgetsOverride] = useState<
    Partial<Record<string, Partial<DashboardWidget>>> | undefined
  >()
  const [aktivitas, setAktivitas] = useState<AktivitasDasborItem[] | undefined>()
  const [memuat, setMemuat] = useState(true)

  const tabs = useMemo(
    () => [
      { id: 'lapangan', label: tOrg('zona.lapangan'), hint: tOrg('zona.lapanganHint') },
      { id: 'program', label: tOrg('zona.program'), hint: tOrg('zona.programHint') },
    ],
    [tOrg],
  )

  useEffect(() => {
    if (authLoading) return
    if (!isLoggedIn) {
      setStatsLive({ monitoring: 0, verifikasi: 0, neraca: 0, laporan: 0 })
      setAktivitas([])
      setMemuat(false)
      return
    }

    let batal = false
    setMemuat(true)

    ambilDataDasborOrganisasi(desaSlug)
      .then((data) => {
        if (batal) return
        setStatsLive(data.stats)

        setWidgetsOverride({
          monitoring: {
            description:
              data.stats.monitoring > 0
                ? tOrg('widgets.monitoringDescAda', { total: data.stats.monitoring })
                : tOrg('widgets.monitoringDesc'),
          },
          verifikasi: {
            description:
              data.stats.verifikasi > 0
                ? tOrg('widgets.verifikasiDescAda', { total: data.stats.verifikasi })
                : tOrg('widgets.verifikasiDesc'),
          },
          dana: {
            description:
              data.stats.saldo > 0
                ? tOrg('widgets.danaDescSaldo', { saldo: data.stats.dana })
                : tOrg('widgets.danaDesc'),
          },
          neraca: {
            description:
              data.stats.neraca > 0
                ? tOrg('widgets.neracaDescAda', { total: data.stats.neraca })
                : tOrg('widgets.neracaDesc'),
          },
        })

        setAktivitas(
          data.events.map((ev: EventAktivitasOrganisasi) => {
            const statusKey = ev.meta.status
            const statusLabel = STATUS_MONITORING.includes(statusKey as (typeof STATUS_MONITORING)[number])
              ? tMon(statusKey as (typeof STATUS_MONITORING)[number])
              : statusKey.replace(/_/g, ' ')
            return {
              id: ev.id,
              label: tFeed('monitoring', {
                indikator: ev.meta.indikator,
                nilai: ev.meta.nilai,
                status: statusLabel,
              }),
              href: ev.href,
              waktu: formatWaktuRelatif(ev.waktu, locale),
            }
          }),
        )
      })
      .catch(() => {
        if (batal) return
        setStatsLive({ monitoring: 0, verifikasi: 0 })
        setAktivitas([])
      })
      .finally(() => {
        if (!batal) setMemuat(false)
      })

    return () => {
      batal = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- muat ulang saat sesi/desa berubah
  }, [authLoading, isLoggedIn, desaSlug, locale])

  const statsMerged = useMemo(
    () => ({ ...statsServer, ...statsLive }),
    [statsServer, statsLive],
  )

  const pendingVerif =
    typeof statsMerged.verifikasi === 'number' ? statsMerged.verifikasi : undefined

  const stats: DashboardStat[] = useMemo(() => {
    const merged = config.stats.map((s) => ({
      ...s,
      value: memuat && ['monitoring', 'verifikasi', 'dana'].includes(s.id) ? '…' : (statsMerged[s.id] ?? s.value),
    }))
    return merged.filter((s) => STAT_ZONA[s.id] === zona)
  }, [config.stats, statsMerged, zona, memuat])

  const widgets = useMemo(() => {
    const all = config.widgets.map((w) => ({ ...w, ...widgetsOverride?.[w.id] }))
    return filterZona(all, zona)
  }, [config.widgets, widgetsOverride, zona])

  const aksiCepat: DashboardQuickAction[] = useMemo(
    () => filterZona(config.aksiCepat, zona),
    [config.aksiCepat, zona],
  )

  return (
    <DashboardViewShell desaSlug={desaSlug} desaNama={desaNama} config={config}>
      <div className="space-y-8">
        <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 p-5 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-neutral-900/60 dark:to-teal-950/20 sm:p-6">
          <div className="flex flex-wrap items-start gap-3">
            <GlobeAmericasIcon
              className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-400"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-100/90 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                  {tOrg('badge')}
                </span>
                <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/50 dark:text-primary-200">
                  {t('fase', { fase: config.fase })}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                {config.deskripsi}
              </p>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{tOrg('intro')}</p>
              {pendingVerif !== undefined && pendingVerif > 0 ? (
                <p className="mt-3 inline-flex rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                  {tOrg('pendingVerifikasi', { count: pendingVerif })}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-5">
            <DashboardZoneTabs
              zona={zona}
              onZonaChange={(z) => setZona(z as ZonaDasborOrganisasi)}
              tabs={tabs}
              ariaLabel={tOrg('zona.label')}
            />
          </div>
        </div>

        {zona === 'program' && widgets.some((w) => w.segera || w.placeholder) ? (
          <p className="inline-flex items-center gap-1 text-xs text-amber-800 dark:text-amber-200">
            <BeakerIcon className="size-3.5" aria-hidden />
            {tOrg('programNote')}
          </p>
        ) : null}

        <section>
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {tOrg('zona.ringkasan', { zona: tOrg(`zona.${zona}`) })}
          </h2>
          <DashboardStatGrid stats={stats} />
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {tOrg('zona.modul', { zona: tOrg(`zona.${zona}`) })}
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
            <DashboardActivity
              items={aktivitas ?? config.aktivitasContoh.map((label, i) => ({ id: `contoh-${i}`, label }))}
              kosong={tFeed('kosong')}
            />
            {(aktivitas?.length ?? 0) > 0 ? null : (
              <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{t('aktivitasNote')}</p>
            )}
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

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
  ZonaDasborPenyedia,
} from '@/lib/kiluan/dashboard-peran'
import {
  ambilDataDasborPenyedia,
  type EventAktivitasPenyedia,
} from '@/lib/kiluan/penyedia-stats'
import { daftarPeranPengguna, dasborHref, labelPeran, type PeranKode } from '@/lib/kiluan/peran'
import { useAuth } from '@/contexts/AuthProvider'
import { Link } from '@/i18n/navigation'
import {
  ArrowRightIcon,
  BeakerIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
  config: DashboardPeranConfig
  peran: Extract<PeranKode, 'umkm' | 'agen'>
  statsOverride?: Partial<Record<string, string | number>>
}

const STAT_ZONA_UMKM: Record<string, ZonaDasborPenyedia> = {
  produk: 'katalog',
  tingkat: 'katalog',
  pesanan: 'operasional',
  pendapatan: 'operasional',
}

const STAT_ZONA_AGEN: Record<string, ZonaDasborPenyedia> = {
  paket: 'katalog',
  draft: 'katalog',
  pesanan: 'operasional',
  pendapatan: 'operasional',
}

const STATUS_PESANAN = [
  'menunggu_pembayaran',
  'dibayar',
  'diproses',
  'selesai',
  'dibatalkan',
  'kedaluwarsa',
  'refund_diajukan',
] as const

function filterZona<T extends { zona?: ZonaDasbor }>(items: T[], zona: ZonaDasborPenyedia): T[] {
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

export default function PenyediaDashboardView({
  desaSlug,
  desaNama,
  config,
  peran,
  statsOverride: statsServer,
}: Props) {
  const { user, isLoggedIn, isLoading: authLoading } = useAuth()
  const locale = useLocale()
  const t = useTranslations('dasbor.view')
  const tPenyedia = useTranslations('dasbor.penyedia')
  const tFeed = useTranslations('dasbor.penyedia.aktivitasFeed')
  const tPesanan = useTranslations('pesanan.status')
  const tPeran = useTranslations('peran')

  const [zona, setZona] = useState<ZonaDasborPenyedia>('katalog')
  const [statsLive, setStatsLive] = useState<Partial<Record<string, string | number>> | undefined>()
  const [widgetsOverride, setWidgetsOverride] = useState<
    Partial<Record<string, Partial<DashboardWidget>>> | undefined
  >()
  const [aktivitas, setAktivitas] = useState<AktivitasDasborItem[] | undefined>()
  const [memuat, setMemuat] = useState(true)

  const peranLain = useMemo(() => {
    const aktif = daftarPeranPengguna(user?.profil ?? null)
    const pasangan: PeranKode = peran === 'umkm' ? 'agen' : 'umkm'
    return aktif.includes(pasangan) ? pasangan : null
  }, [user?.profil, peran])

  const statZona = peran === 'umkm' ? STAT_ZONA_UMKM : STAT_ZONA_AGEN

  const tabs = useMemo(
    () => [
      { id: 'katalog', label: tPenyedia('zona.katalog'), hint: tPenyedia('zona.katalogHint') },
      { id: 'operasional', label: tPenyedia('zona.operasional'), hint: tPenyedia('zona.operasionalHint') },
    ],
    [tPenyedia],
  )

  useEffect(() => {
    if (authLoading) return
    if (!isLoggedIn) {
      setStatsLive({ pesanan: 0 })
      setAktivitas([])
      setMemuat(false)
      return
    }

    let batal = false
    setMemuat(true)

    ambilDataDasborPenyedia(desaSlug)
      .then((data) => {
        if (batal) return
        setStatsLive({ pesanan: data.stats.pesanan })

        setWidgetsOverride({
          pesanan: {
            description:
              data.stats.pesananTotal > 0
                ? data.stats.pesanan > 0
                  ? tPenyedia('widgets.pesananDescAktif', {
                      aktif: data.stats.pesanan,
                      total: data.stats.pesananTotal,
                    })
                  : tPenyedia('widgets.pesananDescTotal', { total: data.stats.pesananTotal })
                : tPenyedia('widgets.pesananDescKosong'),
          },
          pendapatan: {
            description:
              data.stats.selesai > 0
                ? tPenyedia('widgets.pendapatanDescSelesai', { selesai: data.stats.selesai })
                : tPenyedia('widgets.pendapatanDesc'),
          },
        })

        setAktivitas(
          data.events.map((ev: EventAktivitasPenyedia) => {
            const statusKey = ev.meta.status
            const statusLabel = STATUS_PESANAN.includes(statusKey as (typeof STATUS_PESANAN)[number])
              ? tPesanan(statusKey as (typeof STATUS_PESANAN)[number])
              : statusKey.replace(/_/g, ' ')
            return {
              id: ev.id,
              label: tFeed('pesanan', { kode: ev.meta.kode, status: statusLabel }),
              href: ev.href,
              waktu: formatWaktuRelatif(ev.waktu, locale),
            }
          }),
        )
      })
      .catch(() => {
        if (batal) return
        setStatsLive({ pesanan: 0 })
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

  const stats: DashboardStat[] = useMemo(() => {
    const merged = config.stats.map((s) => ({
      ...s,
      value: memuat && s.id === 'pesanan' ? '…' : (statsMerged[s.id] ?? s.value),
    }))
    return merged.filter((s) => statZona[s.id] === zona)
  }, [config.stats, statsMerged, zona, statZona, memuat])

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
        <div className="rounded-2xl border border-kiluan-sea/30 bg-gradient-to-br from-amber-50/80 via-white to-kiluan-sea/10 p-5 dark:border-primary-700/40 dark:from-amber-950/20 dark:via-neutral-900/60 dark:to-primary-950/30 sm:p-6">
          <div className="flex flex-wrap items-start gap-3">
            <BuildingStorefrontIcon
              className="mt-0.5 size-5 shrink-0 text-kiluan-sea dark:text-kiluan-mint"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-kiluan-sea/15 px-2.5 py-0.5 text-xs font-semibold text-primary-800 dark:bg-primary-900/50 dark:text-kiluan-mint">
                  {tPenyedia('badge')}
                </span>
                <span className="rounded-full bg-amber-100/80 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                  {t('fase', { fase: config.fase })}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                {config.deskripsi}
              </p>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{tPenyedia('intro')}</p>
              {peranLain ? (
                <Link
                  href={dasborHref(desaSlug, peranLain)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-medium text-primary-800 ring-1 ring-kiluan-sea/25 transition hover:bg-white dark:bg-neutral-800/80 dark:text-primary-200 dark:ring-primary-700"
                >
                  {tPenyedia('peranLain', { peran: labelPeran(peranLain, tPeran) })}
                  <ArrowRightIcon className="size-3.5" aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>
          <div className="mt-5">
            <DashboardZoneTabs
              zona={zona}
              onZonaChange={(z) => setZona(z as ZonaDasborPenyedia)}
              tabs={tabs}
              ariaLabel={tPenyedia('zona.label')}
            />
          </div>
        </div>

        {zona === 'operasional' && stats.some((s) => s.value === '—') ? (
          <p className="inline-flex items-center gap-1 text-xs text-amber-800 dark:text-amber-200">
            <BeakerIcon className="size-3.5" aria-hidden />
            {tPenyedia('escrowNote')}
          </p>
        ) : null}

        <section>
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {tPenyedia('zona.ringkasan', { zona: tPenyedia(`zona.${zona}`) })}
          </h2>
          <DashboardStatGrid stats={stats} />
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {tPenyedia('zona.modul', { zona: tPenyedia(`zona.${zona}`) })}
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

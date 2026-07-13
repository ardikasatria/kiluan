'use client'

import { Link } from '@/i18n/navigation'
import { pesanGalat } from '@/lib/api/galat'
import { getMonitoringSaya } from '@/lib/api/lestari'
import type { MonitoringDto } from '@/lib/api/types'
import { daftarPembacaanLokal } from '@/lib/offline/monitoring-sync'
import type { PembacaanMonitoringLokal } from '@/lib/offline/db'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

function badgeClass(status: string) {
  if (status === 'terverifikasi') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
  if (status === 'ditolak') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
  if (status === 'menunggu_kirim') return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
  return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
}

export default function MonitoringDaftarClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('lestari.monitoring')
  const locale = useLocale()
  const [server, setServer] = useState<MonitoringDto[]>([])
  const [lokal, setLokal] = useState<PembacaanMonitoringLokal[]>([])
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const [res, rows] = await Promise.all([
        getMonitoringSaya(desaSlug).catch(() => ({ item: [] as MonitoringDto[] })),
        daftarPembacaanLokal(desaSlug),
      ])
      setServer(res.item)
      setLokal(rows)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-emerald-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <p className="text-sm text-primary-600 dark:text-primary-400">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">{t('listTitle')}</h1>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href={`/${desaSlug}/lestari/monitoring/catat`}
              className="rounded-full bg-primary-700 px-4 py-1.5 font-medium text-white dark:bg-primary-600"
            >
              {t('catatBaru')}
            </Link>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl py-8">
        {galat && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30">{galat}</p>
        )}
        {loading ? (
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        ) : (
          <ul className="space-y-3">
            {lokal.map((row) => (
              <li key={row.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-neutral-500">{row.id.slice(0, 8)}…</p>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t('antreanLokal')}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass(row.status)}`}>
                    {t(`status.${row.status}`)}
                  </span>
                </div>
              </li>
            ))}
            {server.map((m) => {
              const ind = 'nama' in m.indikator ? m.indikator.nama : `#${m.indikator.id}`
              return (
                <li key={m.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{ind}</p>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        {m.nilai} · {m.waktu_ukur}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass(m.status)}`}>
                      {t(`status.${m.status}`)}
                    </span>
                  </div>
                </li>
              )
            })}
            {!lokal.length && !server.length && (
              <p className="text-center text-sm text-neutral-500">{t('empty')}</p>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

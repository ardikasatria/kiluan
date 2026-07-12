'use client'

import { Link } from '@/i18n/navigation'
import { daftarKeanggotaan } from '@/lib/api/keanggotaan'
import { getAntreanKurasi } from '@/lib/api/kontribusi'
import { getAntreanValidasi } from '@/lib/api/naik-kelas'
import { getUmkmKelola } from '@/lib/api/pasar'
import { getVerifikasiAntrean } from '@/lib/api/penjelajah'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

interface StatAntrean {
  id: string
  label: string
  nilai: number | null
  href: string
}

export default function KelolaRingkasanStatsClient({ desaSlug }: Props) {
  const t = useTranslations('kelola.ringkasan')
  const [stats, setStats] = useState<StatAntrean[]>([])
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    const base = `/${desaSlug}/kelola`
    const defs: Omit<StatAntrean, 'nilai'>[] = [
      { id: 'keanggotaan', label: t('antreanKeanggotaan'), href: `${base}/keanggotaan` },
      { id: 'umkm', label: t('antreanUmkm'), href: `${base}/umkm` },
      { id: 'kurasi', label: t('antreanKurasi'), href: `${base}/kurasi` },
      { id: 'validasi', label: t('antreanValidasi'), href: `${base}/validasi-kartu` },
      { id: 'verifikasi', label: t('antreanVerifikasi'), href: `${base}/verifikasi` },
    ]

    const results = await Promise.allSettled([
      daftarKeanggotaan(desaSlug, { status: 'menunggu' }),
      getUmkmKelola(desaSlug, { status: 'menunggu' }),
      getAntreanKurasi(desaSlug, { status: 'menunggu' }),
      getAntreanValidasi(desaSlug, { status: 'menunggu' }),
      getVerifikasiAntrean(desaSlug, { hasil: 'menunggu' }),
    ])

    setStats(
      defs.map((d, i) => {
        const res = results[i]
        const nilai =
          res?.status === 'fulfilled' && 'item' in res.value
            ? res.value.item.length
            : null
        return { ...d, nilai }
      }),
    )
    setLoading(false)
  }, [desaSlug, t])

  useEffect(() => {
    void muat()
  }, [muat])

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('antreanTitle')}</h3>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{t('antreanHint')}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {(loading ? Array.from({ length: 5 }, (_, i) => ({ id: `sk-${i}` })) : stats).map((s) => {
          if (loading) {
            return (
              <div
                key={s.id}
                className="h-[88px] animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/60"
              />
            )
          }
          const stat = s as StatAntrean
          const pending = stat.nilai != null && stat.nilai > 0
          return (
            <Link
              key={stat.id}
              href={stat.href}
              className={clsx(
                'rounded-2xl border p-4 transition',
                pending
                  ? 'border-amber-300 bg-amber-50/60 hover:border-amber-400 dark:border-amber-700 dark:bg-amber-950/20'
                  : 'border-neutral-200 bg-white hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:border-primary-600',
              )}
            >
              <p
                className={clsx(
                  'text-2xl font-bold',
                  pending
                    ? 'text-amber-800 dark:text-amber-200'
                    : 'text-primary-700 dark:text-primary-300',
                )}
              >
                {stat.nilai ?? '—'}
              </p>
              <p className="mt-1 text-xs leading-snug text-neutral-600 dark:text-neutral-400">{stat.label}</p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

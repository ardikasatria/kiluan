'use client'

import { pesanGalat } from '@/lib/api/galat'
import { getAturanPoin, getKatalogBadge } from '@/lib/api/lencana'
import type { AturanPoinItem, BadgeItem } from '@/lib/api/types'
import { formatPoin } from '@/lib/i18n/format'
import { SparklesIcon, TrophyIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

export default function AturanPoinKelolaClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.poin')
  const tr = t as unknown as (key: string) => string
  const [aturan, setAturan] = useState<AturanPoinItem[]>([])
  const [badge, setBadge] = useState<BadgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const [a, b] = await Promise.all([getAturanPoin(desaSlug), getKatalogBadge(desaSlug)])
      setAturan(a)
      setBadge(b)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en') || t('errors.load'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale, t])

  useEffect(() => {
    void muat()
  }, [muat])

  function labelAksi(item: AturanPoinItem): string {
    const key = `aksi.${item.kode_aksi}`
    const translated = tr(key)
    if (translated !== key) return translated
    return item.deskripsi ?? item.kode_aksi
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">{t('loading')}</p>
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
          {galat}
        </p>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        {t('readOnlyNote')}
      </div>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="border-b border-neutral-200 bg-neutral-50/70 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-800/50">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-primary-600 dark:text-primary-300" aria-hidden />
            <h3 className="font-semibold text-primary-800 dark:text-primary-100">{t('aturanTitle')}</h3>
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('aturanHint')}</p>
        </div>
        {aturan.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-500">{t('emptyAturan')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-700">
                  <th className="px-5 py-3 font-semibold">{t('col.aksi')}</th>
                  <th className="px-5 py-3 font-semibold">{t('col.poin')}</th>
                  <th className="px-5 py-3 font-semibold">{t('col.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {aturan.map((a) => (
                  <tr key={a.kode_aksi}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{labelAksi(a)}</p>
                      <p className="mt-0.5 font-mono text-xs text-neutral-500">{a.kode_aksi}</p>
                    </td>
                    <td className="px-5 py-3 font-semibold text-primary-700 dark:text-primary-300">
                      +{formatPoin(a.poin, locale as 'id' | 'en')}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          a.aktif
                            ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'
                            : 'rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                        }
                      >
                        {a.aktif ? t('status.aktif') : t('status.nonaktif')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="border-b border-neutral-200 bg-neutral-50/70 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-800/50">
          <div className="flex items-center gap-2">
            <TrophyIcon className="size-5 text-primary-600 dark:text-primary-300" aria-hidden />
            <h3 className="font-semibold text-primary-800 dark:text-primary-100">{t('badgeTitle')}</h3>
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('badgeHint')}</p>
        </div>
        {badge.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-500">{t('emptyBadge')}</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {badge.map((b) => (
              <li key={b.id} className="flex items-start gap-3 px-5 py-4">
                <span className="text-2xl" aria-hidden>
                  {b.ikon ?? '🏅'}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{b.nama}</p>
                  {b.deskripsi && (
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{b.deskripsi}</p>
                  )}
                  <p className="mt-1 font-mono text-[10px] text-neutral-400">{b.kode}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

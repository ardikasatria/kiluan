'use client'

import { buatRrulePreview, type HariRrule } from '@/lib/kiluan/rrule'
import { formatTanggal } from '@/lib/kiluan/lencana'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'

interface Props {
  freq: string
  interval?: number
  byday?: HariRrule[]
  berlakuMulai: string
  berlakuSampai?: string
  count?: number
}

export default function RrulePreview({
  freq,
  interval = 1,
  byday = [],
  berlakuMulai,
  berlakuSampai,
  count = 8,
}: Props) {
  const t = useTranslations('kelola.kalender')
  const locale = useLocale()

  const tanggal = useMemo(
    () =>
      buatRrulePreview({
        freq,
        interval,
        byday,
        berlakuMulai,
        berlakuSampai,
        count,
      }),
    [freq, interval, byday, berlakuMulai, berlakuSampai, count],
  )

  if (freq === 'WEEKLY' && byday.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('previewBydayKosong')}</p>
  }

  if (!tanggal.length) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('previewEmpty')}</p>
  }

  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-600 dark:bg-neutral-800/40">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {t('previewTitle')}
      </p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('previewDisclaimer')}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {tanggal.map((d) => (
          <li
            key={d.toISOString()}
            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-primary-800 shadow-sm dark:bg-neutral-900 dark:text-primary-200"
          >
            {formatTanggal(d.toISOString(), locale === 'en' ? 'en-US' : 'id-ID')}
          </li>
        ))}
      </ul>
    </div>
  )
}

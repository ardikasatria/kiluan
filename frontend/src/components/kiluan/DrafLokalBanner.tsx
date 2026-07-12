'use client'

import { useLocale, useTranslations } from 'next-intl'
import type { StatusDrafLokal } from '@/hooks/useDrafFormLokal'
import type { EntriDrafLokal } from '@/lib/kiluan/draf-lokal'

interface Props<T> {
  menungguPulihkan: EntriDrafLokal<T> | null
  status: StatusDrafLokal
  diperbaruiPada: number | null
  onPulihkan: () => void
  onBuang: () => void
}

export default function DrafLokalBanner<T>({
  menungguPulihkan,
  status,
  diperbaruiPada,
  onPulihkan,
  onBuang,
}: Props<T>) {
  const t = useTranslations('kelola.drafLokal')
  const locale = useLocale()
  const localeTag = locale === 'en' ? 'en-US' : 'id-ID'

  const waktu =
    diperbaruiPada != null
      ? new Date(diperbaruiPada).toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })
      : menungguPulihkan
        ? new Date(menungguPulihkan.diperbaruiPada).toLocaleTimeString(localeTag, {
            hour: '2-digit',
            minute: '2-digit',
          })
        : null

  return (
    <div className="space-y-2">
      {menungguPulihkan && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">{t('bannerJudul')}</p>
            <p className="mt-0.5 text-amber-800 dark:text-amber-200">
              {t('bannerDesc', { waktu: waktu ?? '—' })}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onPulihkan}
              className="rounded-full bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
            >
              {t('pulihkan')}
            </button>
            <button
              type="button"
              onClick={onBuang}
              className="rounded-full border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/50"
            >
              {t('buang')}
            </button>
          </div>
        </div>
      )}

      {!menungguPulihkan && status !== 'idle' && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {status === 'menyimpan' ? t('menyimpan') : t('tersimpan', { waktu: waktu ?? '—' })}
        </p>
      )}
    </div>
  )
}

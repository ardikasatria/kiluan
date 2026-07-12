'use client'

import BadgeStatusStempel from '@/components/kiluan/penjelajah/BadgeStatusStempel'
import type { StempelDto } from '@/lib/api/types'
import { CheckBadgeIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'

interface Props {
  stempel: StempelDto
  teksDampak: (dampak: Record<string, number>) => string
  className?: string
}

export default function StempelCard({ stempel, teksDampak, className }: Props) {
  const t = useTranslations('paspor')
  const locale = useLocale()
  const localeTag = locale === 'en' ? 'en-US' : 'id-ID'
  const terverifikasi = stempel.status === 'terverifikasi'

  return (
    <li
      className={clsx(
        'rounded-xl border p-4',
        terverifikasi
          ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
          : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900/40',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <CheckBadgeIcon
            className={clsx(
              'mt-0.5 size-5 shrink-0',
              terverifikasi ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400',
            )}
          />
          <div>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              {stempel.misi?.judul ?? t('missionFallback')}
            </p>
            {stempel.stasiun && (
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{stempel.stasiun.nama}</p>
            )}
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {new Date(stempel.dibuat_pada).toLocaleDateString(localeTag)}
            </p>
            {terverifikasi && Object.keys(stempel.dampak).length > 0 && (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{teksDampak(stempel.dampak)}</p>
            )}
            {!terverifikasi && stempel.status === 'menunggu_verifikasi' && (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">{t('pendingNote')}</p>
            )}
            {stempel.status === 'ditolak' && (
              <p className="mt-2 text-xs text-red-700 dark:text-red-300">{t('rejectedNote')}</p>
            )}
          </div>
        </div>
        <BadgeStatusStempel status={stempel.status} />
      </div>
    </li>
  )
}

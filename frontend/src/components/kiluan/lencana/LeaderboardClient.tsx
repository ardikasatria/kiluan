'use client'

import BadgeChip from '@/components/kiluan/lencana/BadgeChip'
import KiluanAvatar from '@/components/kiluan/KiluanAvatar'
import { getLeaderboard, type PeriodeLeaderboard } from '@/lib/api/lencana'
import type { LeaderboardEntry } from '@/lib/api/types'
import { Link } from '@/i18n/navigation'
import { ArrowLeftIcon, TrophyIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function LeaderboardClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('leaderboard')
  const [periode, setPeriode] = useState<PeriodeLeaderboard>('all')
  const [item, setItem] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const periodeOpsi = useMemo(
    () =>
      (['all', '30h', '7h'] as const).map((id) => ({
        id,
        label: t(`periode.${id}`),
      })),
    [t],
  )

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      setItem(await getLeaderboard(desaSlug, periode))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, periode])

  useEffect(() => {
    void muat()
  }, [muat])

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-amber-500 via-primary-700 to-primary-800 text-white dark:from-amber-900 dark:via-primary-900 dark:to-primary-950">
        <div className="container py-10 sm:py-12">
          <Link
            href={`/${desaSlug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-100 hover:text-white"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            {desaNama}
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <TrophyIcon className="size-8 text-amber-200" aria-hidden />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
              <p className="mt-1 text-sm text-primary-50/90">{t('subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-10 sm:py-12">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('periodeAria')}>
          {periodeOpsi.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={periode === p.id}
              onClick={() => setPeriode(p.id)}
              className={clsx(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                periode === p.id
                  ? 'bg-primary-700 text-white dark:bg-primary-500'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-8 text-center text-sm text-neutral-500">{t('loading')}</p>
        ) : item.length === 0 ? (
          <p className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">{t('empty')}</p>
        ) : (
          <ol className="mt-8 space-y-3">
            {item.map((row) => (
              <li
                key={row.pengguna.id}
                className={clsx(
                  'flex items-center gap-4 rounded-2xl border px-4 py-4 sm:px-5',
                  row.peringkat === 1
                    ? 'border-amber-200 bg-amber-50/80 dark:border-amber-800/50 dark:bg-amber-950/20'
                    : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900/40',
                )}
              >
                <span
                  className={clsx(
                    'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    row.peringkat <= 3
                      ? 'bg-primary-700 text-white dark:bg-primary-500'
                      : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200',
                  )}
                >
                  {row.peringkat}
                </span>
                <KiluanAvatar
                  nama={row.pengguna.nama}
                  src={row.pengguna.avatar}
                  width={40}
                  height={40}
                  className="size-10 ring-2 ring-white dark:ring-neutral-800"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-primary-800 dark:text-primary-100">
                    {row.pengguna.nama}
                  </p>
                  {row.badge_teratas && (
                    <div className="mt-1">
                      <BadgeChip
                        nama={row.badge_teratas.nama}
                        ikon={row.badge_teratas.ikon}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
                <p className="shrink-0 text-lg font-bold text-kiluan-sea dark:text-kiluan-mint">
                  {row.poin.toLocaleString('id-ID')}
                </p>
              </li>
            ))}
          </ol>
        )}

        <p className="mt-8 text-center text-xs text-neutral-500 dark:text-neutral-500">
          {t('signInPrompt')}{' '}
          <Link href={`/${desaSlug}/saya/lencana`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            {t('myBadges')}
          </Link>
        </p>
      </div>
    </div>
  )
}

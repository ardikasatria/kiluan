'use client'

import clsx from 'clsx'
import { useTranslations } from 'next-intl'

interface Props {
  nama: string
  ikon?: string | null
  tingkat?: number
  dimiliki?: boolean
  size?: 'sm' | 'md'
  className?: string
}

function warnaBadge(tingkat: number): string {
  if (tingkat >= 3) {
    return 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-700/50'
  }
  if (tingkat >= 2) {
    return 'bg-primary-50 text-primary-800 ring-primary-200 dark:bg-primary-900/40 dark:text-primary-100 dark:ring-primary-600/40'
  }
  return 'bg-kiluan-mint/20 text-primary-800 ring-kiluan-mint/40 dark:text-primary-100'
}

export default function BadgeChip({
  nama,
  ikon,
  tingkat = 1,
  dimiliki = true,
  size = 'md',
  className,
}: Props) {
  const t = useTranslations('lencana')

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        dimiliki
          ? warnaBadge(tingkat)
          : 'bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
        className,
      )}
      title={dimiliki ? nama : t('belumDiperoleh', { nama })}
    >
      {ikon ? <span aria-hidden>{ikon}</span> : null}
      <span>{nama}</span>
    </span>
  )
}

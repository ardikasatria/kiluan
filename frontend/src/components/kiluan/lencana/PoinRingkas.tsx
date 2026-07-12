'use client'

import { SparklesIcon } from '@heroicons/react/24/outline'
import { Link } from '@/i18n/navigation'
import { formatPoin } from '@/lib/i18n/format'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'

interface Props {
  saldo: number
  desaSlug?: string
  compact?: boolean
  className?: string
}

export default function PoinRingkas({ saldo, desaSlug, compact, className }: Props) {
  const t = useTranslations('lencana')
  const locale = useLocale() as 'id' | 'en'

  const inner = (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-semibold',
        compact ? 'text-sm' : 'text-base',
        'text-primary-800 dark:text-primary-100',
        className,
      )}
    >
      <SparklesIcon className={clsx(compact ? 'size-4' : 'size-5', 'text-kiluan-sea')} aria-hidden />
      <span>{formatPoin(saldo, locale)}</span>
      {!compact && <span className="font-normal text-neutral-500 dark:text-neutral-400">{t('poin')}</span>}
    </span>
  )

  if (desaSlug) {
    return (
      <Link
        href={`/${desaSlug}/saya/lencana`}
        className="rounded-lg transition hover:bg-primary-50/80 dark:hover:bg-primary-900/30"
      >
        {inner}
      </Link>
    )
  }

  return inner
}

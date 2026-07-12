'use client'

import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { StempelDto } from '@/lib/api/types'
import { warnaBadgeStempel } from '@/lib/kiluan/penjelajah'

interface Props {
  status: StempelDto['status']
  className?: string
}

export default function BadgeStatusStempel({ status, className }: Props) {
  const t = useTranslations('paspor.status')

  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        warnaBadgeStempel(status),
        className,
      )}
    >
      {t(status)}
    </span>
  )
}

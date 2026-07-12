'use client'

import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { StatusPengajuanKartu } from '@/lib/api/types'
import { labelStatusPengajuan, warnaStatusPengajuan } from '@/lib/kiluan/naik-kelas'

interface Props {
  status: StatusPengajuanKartu | string
  className?: string
}

export default function BadgeStatusPengajuan({ status, className }: Props) {
  const t = useTranslations('naikKelas')
  const tLib = t as unknown as (key: string) => string

  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        warnaStatusPengajuan(status),
        className,
      )}
    >
      {labelStatusPengajuan(status, tLib)}
    </span>
  )
}

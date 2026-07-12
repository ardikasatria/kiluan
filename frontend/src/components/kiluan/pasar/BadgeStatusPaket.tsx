'use client'

import { labelStatusPaket, warnaStatusPaket } from '@/lib/kiluan/pasar'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'

interface Props {
  status: string
  className?: string
}

export default function BadgeStatusPaket({ status, className }: Props) {
  const t = useTranslations('pasar.paketKelola')
  const label = labelStatusPaket(status, (key) => t(key as 'statusPaket.draft'))

  return (
    <span className={clsx('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', warnaStatusPaket(status), className)}>
      {label}
    </span>
  )
}

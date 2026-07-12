'use client'

import clsx from 'clsx'
import { CheckIcon } from '@heroicons/react/24/solid'

const ALUR = ['menunggu_pembayaran', 'dibayar', 'diproses', 'selesai'] as const

interface Props {
  status: string
  label: (key: string) => string
}

export default function PesananTimeline({ status, label }: Props) {
  const gagal = ['dibatalkan', 'kedaluwarsa', 'refund_diajukan'].includes(status)
  const idxAktif = ALUR.indexOf(status as (typeof ALUR)[number])
  const langkah = gagal ? ALUR.length : Math.max(0, idxAktif)

  return (
    <ol className="flex flex-wrap gap-2 sm:gap-0">
      {ALUR.map((step, i) => {
        const selesai = !gagal && i < langkah
        const aktif = !gagal && i === langkah
        const terakhir = i === ALUR.length - 1
        return (
          <li
            key={step}
            className={clsx('flex min-w-[4.5rem] flex-1 items-center', !terakhir && 'sm:pe-2')}
          >
            <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-2 sm:text-left">
              <span
                className={clsx(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  selesai && 'bg-primary-600 text-white dark:bg-primary-500',
                  aktif && 'bg-primary-100 text-primary-800 ring-2 ring-primary-500/40 dark:bg-primary-900/60 dark:text-primary-100',
                  !selesai && !aktif && 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500',
                )}
                aria-current={aktif ? 'step' : undefined}
              >
                {selesai ? <CheckIcon className="size-4" aria-hidden /> : i + 1}
              </span>
              <span
                className={clsx(
                  'max-w-[5.5rem] text-[10px] leading-tight font-medium sm:max-w-none sm:text-xs',
                  aktif ? 'text-primary-800 dark:text-primary-200' : 'text-neutral-500 dark:text-neutral-400',
                )}
              >
                {label(`status.${step}`)}
              </span>
            </div>
            {!terakhir && (
              <div
                className={clsx(
                  'mx-1 hidden h-0.5 flex-1 sm:block',
                  selesai ? 'bg-primary-500/60' : 'bg-neutral-200 dark:bg-neutral-700',
                )}
                aria-hidden
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

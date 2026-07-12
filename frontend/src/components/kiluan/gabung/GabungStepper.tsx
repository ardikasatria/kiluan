'use client'

import { langkahGabung, type LangkahGabung } from '@/lib/kiluan/gabung'
import type { PeranKode } from '@/lib/kiluan/peran'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'

interface Props {
  peran: PeranKode | null
  langkah: LangkahGabung
}

export default function GabungStepper({ peran, langkah }: Props) {
  const t = useTranslations('gabung.stepper')
  const urutan = langkahGabung(peran)
  const aktif = urutan.indexOf(langkah)

  const labelLangkah: Record<LangkahGabung, string> = {
    peran: t('peran'),
    desa: t('desa'),
    konfirmasi: t('konfirmasi'),
    hasil: t('hasil'),
  }

  return (
    <nav aria-label={t('ariaLabel')} className="mb-8">
      <ol className="flex flex-wrap items-center gap-2 sm:gap-3">
        {urutan.map((k, i) => {
          const selesai = i < aktif
          const kini = i === aktif
          return (
            <li key={k} className="flex items-center gap-2 sm:gap-3">
              <span
                className={clsx(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm',
                  kini
                    ? 'bg-primary-700 text-white shadow-sm dark:bg-primary-600'
                    : selesai
                      ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200'
                      : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
                )}
                aria-current={kini ? 'step' : undefined}
              >
                <span
                  className={clsx(
                    'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold sm:size-6 sm:text-xs',
                    kini
                      ? 'bg-white/20 text-white'
                      : selesai
                        ? 'bg-primary-600 text-white dark:bg-primary-500'
                        : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
                  )}
                  aria-hidden
                >
                  {selesai ? '✓' : i + 1}
                </span>
                {labelLangkah[k]}
              </span>
              {i < urutan.length - 1 ? (
                <span className="hidden h-px w-4 bg-neutral-300 sm:block dark:bg-neutral-600" aria-hidden />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

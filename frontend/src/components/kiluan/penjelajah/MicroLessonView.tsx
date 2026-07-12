'use client'

import { CheckCircleIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface Props {
  lesson: Record<string, unknown>
  onConfirm: () => void
  disabled?: boolean
  className?: string
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export default function MicroLessonView({ lesson, onConfirm, disabled, className }: Props) {
  const t = useTranslations('misi.lesson')
  const [paham, setPaham] = useState(false)

  const judul = typeof lesson.judul === 'string' ? lesson.judul : null
  const bagian = Array.isArray(lesson.bagian) ? lesson.bagian : []
  const poinKunci = Array.isArray(lesson.poin_kunci) ? lesson.poin_kunci : []

  return (
    <div
      className={clsx(
        'rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-900 dark:bg-emerald-950/30',
        className,
      )}
    >
      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{t('title')}</p>
      {judul && <h3 className="mt-1 text-lg font-bold text-emerald-950 dark:text-emerald-50">{judul}</h3>}

      {bagian.length > 0 && (
        <div className="mt-4 space-y-3">
          {bagian.map((b, i) => {
            if (!isRecord(b)) return null
            const bJudul = typeof b.judul === 'string' ? b.judul : t('sectionFallback', { n: i + 1 })
            const isi = typeof b.isi === 'string' ? b.isi : ''
            return (
              <div
                key={i}
                className="rounded-xl border border-emerald-100 bg-white/80 p-4 dark:border-emerald-900/50 dark:bg-neutral-900/50"
              >
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{bJudul}</p>
                {isi && <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{isi}</p>}
              </div>
            )
          })}
        </div>
      )}

      {poinKunci.length > 0 && (
        <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-emerald-900 dark:text-emerald-100">
          {poinKunci.map((p, i) => (
            <li key={i}>{String(p)}</li>
          ))}
        </ul>
      )}

      {!bagian.length && !poinKunci.length && (
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-white/60 p-3 text-xs text-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300">
          {JSON.stringify(lesson, null, 2)}
        </pre>
      )}

      <label className="mt-5 flex cursor-pointer items-start gap-2 text-sm text-neutral-800 dark:text-neutral-200">
        <input
          type="checkbox"
          checked={paham}
          onChange={(e) => setPaham(e.target.checked)}
          className="mt-0.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600"
        />
        <span>{t('confirm')}</span>
      </label>

      <button
        type="button"
        disabled={disabled || !paham}
        onClick={onConfirm}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
      >
        <CheckCircleIcon className="size-5" />
        {t('complete')}
      </button>
    </div>
  )
}

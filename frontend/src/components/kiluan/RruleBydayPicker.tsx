'use client'

import { HARI_RRULE, type HariRrule } from '@/lib/kiluan/rrule'
import { Label } from '@/shared/fieldset'
import { useTranslations } from 'next-intl'

interface Props {
  value: HariRrule[]
  onChange: (hari: HariRrule[]) => void
}

export default function RruleBydayPicker({ value, onChange }: Props) {
  const t = useTranslations('kelola.kalender')

  function toggle(hari: HariRrule) {
    const aktif = value.includes(hari)
    if (aktif) {
      onChange(value.filter((h) => h !== hari))
    } else {
      onChange([...value, hari].sort((a, b) => HARI_RRULE.indexOf(a) - HARI_RRULE.indexOf(b)))
    }
  }

  return (
    <div className="sm:col-span-2">
      <Label>{t('byday')}</Label>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t('byday')}>
        {HARI_RRULE.map((hari) => {
          const aktif = value.includes(hari)
          return (
            <button
              key={hari}
              type="button"
              aria-pressed={aktif}
              onClick={() => toggle(hari)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                aktif
                  ? 'border-primary-600 bg-primary-600 text-white dark:border-primary-500 dark:bg-primary-600'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:border-primary-400 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300'
              }`}
            >
              {t(`hari.${hari}`)}
            </button>
          )
        })}
      </div>
      {value.length === 0 && (
        <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">{t('bydayKosong')}</p>
      )}
    </div>
  )
}

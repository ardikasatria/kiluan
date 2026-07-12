'use client'

import Input from '@/shared/Input'
import { useTranslations } from 'next-intl'

const HARI = ['sen', 'sel', 'rab', 'kam', 'jum', 'sab', 'min'] as const

interface Props {
  value: Record<string, string>
  onChange: (next: Record<string, string>) => void
}

export default function JamOperasionalEditor({ value, onChange }: Props) {
  const t = useTranslations('kelola.destinasi.form')

  const ubah = (hari: string, jam: string) => {
    const next = { ...value }
    if (jam.trim()) next[hari] = jam
    else delete next[hari]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('jamHint')}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {HARI.map((hari) => (
          <label key={hari} className="flex items-center gap-3 text-sm">
            <span className="w-10 shrink-0 font-medium capitalize text-neutral-700 dark:text-neutral-300">
              {t(`hari.${hari}`)}
            </span>
            <Input
              value={value[hari] ?? ''}
              onChange={(e) => ubah(hari, e.target.value)}
              placeholder={t('jamPlaceholder')}
              className="flex-1"
            />
          </label>
        ))}
      </div>
    </div>
  )
}

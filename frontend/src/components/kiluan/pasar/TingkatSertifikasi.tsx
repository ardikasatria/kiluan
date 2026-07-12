'use client'

import type { Locale } from '@/i18n/routing'
import { labelTingkat } from '@/lib/i18n/referensi'
import { GlobeAsiaAustraliaIcon, SunIcon, TrophyIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useLocale } from 'next-intl'

type Ukuran = 'sm' | 'md'

interface Props {
  tingkat?: string | null
  skor?: number
  size?: Ukuran
  className?: string
}

const IKON: Record<string, typeof SunIcon> = {
  tunas: SunIcon,
  bahari: GlobeAsiaAustraliaIcon,
  lumba_lumba: TrophyIcon,
}

/** Warna chip per tingkat — konsisten light & dark. */
const WARNA: Record<string, string> = {
  tunas: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/60',
  bahari: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-800/60',
  lumba_lumba: 'bg-primary-50 text-primary-800 ring-primary-200 dark:bg-primary-900/40 dark:text-primary-100 dark:ring-primary-700/60',
}

/**
 * Chip tingkat sertifikasi Naik Kelas Lestari (Tunas / Bahari / Lumba-Lumba).
 * Reusable di direktori pasar, detail UMKM, dan dashboard.
 */
export default function TingkatSertifikasi({ tingkat, skor, size = 'sm', className }: Props) {
  const locale = useLocale() as Locale
  if (!tingkat) return null

  const Icon = IKON[tingkat] ?? SunIcon
  const label = labelTingkat(tingkat, locale)

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-medium ring-1',
        WARNA[tingkat] ?? WARNA.tunas,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className,
      )}
    >
      <Icon className={size === 'sm' ? 'size-3.5 shrink-0' : 'size-4 shrink-0'} aria-hidden />
      {label}
      {skor != null ? <span className="opacity-70">· {skor}</span> : null}
    </span>
  )
}

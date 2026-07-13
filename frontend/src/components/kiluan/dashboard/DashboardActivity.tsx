'use client'

import { Link } from '@/i18n/navigation'
import { ClockIcon } from '@heroicons/react/24/outline'
import { useLocale } from 'next-intl'

export interface AktivitasDasborItem {
  id: string
  label: string
  href?: string
  waktu?: string
}

interface Props {
  items: AktivitasDasborItem[]
  kosong?: string
}

function formatWaktuRelatif(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const detik = Math.floor((Date.now() - d.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale === 'en' ? 'en' : 'id', { numeric: 'auto' })
  if (detik < 60) return rtf.format(-detik, 'second')
  const menit = Math.floor(detik / 60)
  if (menit < 60) return rtf.format(-menit, 'minute')
  const jam = Math.floor(menit / 60)
  if (jam < 48) return rtf.format(-jam, 'hour')
  const hari = Math.floor(jam / 24)
  if (hari < 14) return rtf.format(-hari, 'day')
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', {
    day: 'numeric',
    month: 'short',
  })
}

function BarisAktivitas({ item, locale }: { item: AktivitasDasborItem; locale: string }) {
  const waktu = item.waktu ? formatWaktuRelatif(item.waktu, locale) : null
  const isi = (
    <>
      <ClockIcon className="mt-0.5 size-4 shrink-0 text-primary-500 dark:text-kiluan-mint" aria-hidden />
      <div className="min-w-0 flex-1">
        <p>{item.label}</p>
        {waktu ? <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{waktu}</p> : null}
      </div>
    </>
  )

  const className =
    'flex gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-300'

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={`${className} transition hover:border-kiluan-sea/50 hover:shadow-sm dark:hover:border-primary-600`}
      >
        {isi}
      </Link>
    )
  }

  return <div className={className}>{isi}</div>
}

export default function DashboardActivity({ items, kosong }: Props) {
  const locale = useLocale()

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
        {kosong ?? '—'}
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <BarisAktivitas item={item} locale={locale} />
        </li>
      ))}
    </ul>
  )
}

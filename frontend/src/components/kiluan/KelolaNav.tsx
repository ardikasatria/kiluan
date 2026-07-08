'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const ITEMS = [
  { href: '', label: 'Ringkasan' },
  { href: '/destinasi', label: 'Destinasi' },
  { href: '/layanan', label: 'Layanan' },
  { href: '/kalender', label: 'Kalender' },
]

interface Props {
  desaSlug: string
}

export default function KelolaNav({ desaSlug }: Props) {
  const pathname = usePathname()
  const base = `/${desaSlug}/kelola`

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200 pb-px dark:border-neutral-700">
      {ITEMS.map((item) => {
        const href = `${base}${item.href}`
        const aktif = item.href === '' ? pathname === base : pathname.startsWith(href)
        return (
          <Link
            key={item.href}
            href={href}
            className={clsx(
              'shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition',
              aktif
                ? 'border-b-2 border-primary-600 text-primary-800 dark:border-primary-400 dark:text-primary-100'
                : 'text-neutral-600 hover:text-primary-700 dark:text-neutral-400 dark:hover:text-primary-300',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

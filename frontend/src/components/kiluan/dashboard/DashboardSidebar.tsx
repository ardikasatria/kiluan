'use client'

import type { DashboardNavItem } from '@/lib/kiluan/dashboard-peran'
import { labelPeran, slugPeran, type PeranKode } from '@/lib/kiluan/peran'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import RoleSwitcher from './RoleSwitcher'

interface Props {
  desaSlug: string
  peran: PeranKode
  nav: DashboardNavItem[]
  tagline: string
}

export default function DashboardSidebar({ desaSlug, peran, nav, tagline }: Props) {
  const pathname = usePathname()
  const base = peran === 'admin' ? '/admin/dasbor' : `/${desaSlug}/dasbor/${slugPeran(peran)}`

  return (
    <aside className="lg:w-64 lg:shrink-0 lg:border-r lg:border-neutral-200 lg:pr-6 dark:lg:border-neutral-800">
      <div className="mb-6 hidden lg:block">
        <p className="text-xs font-medium tracking-wide text-primary-600 uppercase dark:text-primary-400">
          Dasbor
        </p>
        <h2 className="mt-1 text-lg font-bold text-primary-800 dark:text-primary-100">{labelPeran(peran)}</h2>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{tagline}</p>
      </div>

      <RoleSwitcher desaSlug={desaSlug} peranAktif={peran} className="mb-6 hidden lg:block" />

      <nav
        className="flex gap-1 overflow-x-auto border-b border-neutral-200 pb-px lg:flex-col lg:overflow-visible lg:border-0 lg:pb-0 dark:border-neutral-700"
        aria-label={`Navigasi ${labelPeran(peran)}`}
      >
        {nav.map((item) => {
          const href = `${base}${item.segment}`
          const aktif = item.segment === '' ? pathname === base : pathname.startsWith(href)
          return (
            <Link
              key={item.id}
              href={href}
              className={clsx(
                'flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition lg:rounded-lg',
                aktif
                  ? 'border-b-2 border-primary-600 text-primary-800 lg:border-0 lg:bg-primary-50 dark:border-primary-400 dark:text-primary-100 dark:lg:bg-primary-900/40'
                  : 'text-neutral-600 hover:text-primary-700 lg:hover:bg-neutral-50 dark:text-neutral-400 dark:lg:hover:bg-neutral-800/60',
              )}
            >
              {item.label}
              {item.segera && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  F+
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

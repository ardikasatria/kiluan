import type { DashboardQuickAction } from '@/lib/kiluan/dashboard-peran'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import DashboardPhaseBadge from './DashboardPhaseBadge'

interface Props {
  actions: DashboardQuickAction[]
}

export default function DashboardQuickActions({ actions }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          className={
            a.primary
              ? 'inline-flex items-center gap-2 rounded-full bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500'
              : 'inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition hover:border-kiluan-sea/50 dark:border-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-200 dark:hover:border-primary-600'
          }
        >
          {a.label}
          {a.segera ? <DashboardPhaseBadge compact /> : <ArrowRightIcon className="size-3.5 opacity-60" aria-hidden />}
        </Link>
      ))}
    </div>
  )
}

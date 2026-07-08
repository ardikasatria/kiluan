import type { DashboardQuickAction } from '@/lib/kiluan/dashboard-peran'
import Link from 'next/link'

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
              ? 'inline-flex items-center gap-2 rounded-full bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500'
              : 'inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:border-primary-300 dark:border-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-200 dark:hover:border-primary-600'
          }
        >
          {a.label}
          {a.segera && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              F+
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}

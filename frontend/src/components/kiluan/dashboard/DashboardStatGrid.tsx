import type { DashboardStat } from '@/lib/kiluan/dashboard-peran'
import DashboardPhaseBadge from '@/components/kiluan/dashboard/DashboardPhaseBadge'
import { Link } from '@/i18n/navigation'

interface Props {
  stats: DashboardStat[]
}

export default function DashboardStatGrid({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((s) => {
        const isPlaceholder = s.value === '—' || s.segera
        const inner = (
          <>
            <div className="flex items-start justify-between gap-2">
              <p
                className={
                  isPlaceholder
                    ? 'text-lg font-semibold text-neutral-400 dark:text-neutral-500'
                    : 'text-2xl font-bold text-primary-700 dark:text-kiluan-mint'
                }
              >
                {s.value}
              </p>
              {s.segera || (s.fase && isPlaceholder) ? (
                <DashboardPhaseBadge fase={s.fase} compact />
              ) : null}
            </div>
            <p className="mt-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">{s.label}</p>
            {s.hint && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{s.hint}</p>}
          </>
        )
        const className =
          'rounded-2xl border border-neutral-200 bg-white p-4 transition sm:p-5 dark:border-neutral-700 dark:bg-neutral-800/60'
        return s.href ? (
          <Link
            key={s.id}
            href={s.href}
            className={`${className} hover:border-kiluan-sea/50 hover:shadow-sm dark:hover:border-primary-600`}
          >
            {inner}
          </Link>
        ) : (
          <div key={s.id} className={className}>
            {inner}
          </div>
        )
      })}
    </div>
  )
}

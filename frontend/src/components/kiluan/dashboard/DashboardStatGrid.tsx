import type { DashboardStat } from '@/lib/kiluan/dashboard-peran'
import Link from 'next/link'

interface Props {
  stats: DashboardStat[]
}

export default function DashboardStatGrid({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((s) => {
        const inner = (
          <>
            <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">{s.value}</p>
            <p className="mt-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">{s.label}</p>
            {s.hint && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{s.hint}</p>}
          </>
        )
        const className =
          'rounded-2xl border border-neutral-200 bg-white p-4 transition sm:p-5 dark:border-neutral-700 dark:bg-neutral-800/60'
        return s.href ? (
          <Link key={s.id} href={s.href} className={`${className} hover:border-primary-300 dark:hover:border-primary-600`}>
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

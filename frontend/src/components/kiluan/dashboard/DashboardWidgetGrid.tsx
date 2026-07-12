import type { DashboardWidget } from '@/lib/kiluan/dashboard-peran'
import {
  ArrowRightIcon,
  ChartBarIcon,
  CubeTransparentIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import DashboardPhaseBadge from './DashboardPhaseBadge'

interface Props {
  widgets: DashboardWidget[]
}

export default function DashboardWidgetGrid({ widgets }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {widgets.map((w) => (
        <article
          key={w.id}
          className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800/60"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-kiluan-mint/20 text-primary-700 dark:bg-primary-900/50 dark:text-kiluan-mint">
              <CubeTransparentIcon className="size-5" aria-hidden />
            </div>
            {w.segera || w.placeholder ? (
              <DashboardPhaseBadge fase={w.fase} compact />
            ) : (
              <span className="rounded-full bg-kiluan-mint/25 px-2 py-0.5 text-[10px] font-semibold text-primary-800 dark:bg-primary-900/50 dark:text-kiluan-mint">
                Fase {w.fase}
              </span>
            )}
          </div>
          <h3 className="mt-3 font-semibold text-primary-800 dark:text-primary-100">{w.title}</h3>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {w.description}
          </p>
          {w.placeholder ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-400">
              <ChartBarIcon className="size-4 shrink-0" aria-hidden />
              Data terverifikasi menyusul — tanpa angka dummy
            </div>
          ) : w.href ? (
            <Link
              href={w.href}
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-600 dark:text-primary-300"
            >
              {w.segera ? 'Lihat rencana' : 'Buka'}
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
          ) : null}
        </article>
      ))}
    </div>
  )
}

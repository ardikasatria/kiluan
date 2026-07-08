import type { DashboardModulLink } from '@/lib/kiluan/dashboard-peran'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface Props {
  modul: DashboardModulLink[]
}

export default function DashboardModulLinks({ modul }: Props) {
  return (
    <ul className="space-y-2">
      {modul.map((m) => (
        <li key={m.href + m.label}>
          <Link
            href={m.href}
            className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-800 transition hover:border-primary-300 hover:bg-primary-50/50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
          >
            {m.label}
            <ArrowTopRightOnSquareIcon className="size-4 shrink-0 text-neutral-400" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  )
}

import { ClockIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface Props {
  fase?: string
  className?: string
  compact?: boolean
}

export default function DashboardPhaseBadge({ fase, className, compact }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full bg-amber-100 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        className,
      )}
    >
      <ClockIcon className={compact ? 'size-3' : 'size-3.5'} aria-hidden />
      {fase ? `Fase ${fase}` : 'Segera'}
    </span>
  )
}

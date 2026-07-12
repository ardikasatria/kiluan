import { ClockIcon } from '@heroicons/react/24/outline'

interface Props {
  items: string[]
}

export default function DashboardActivity({ items }: Props) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-300"
        >
          <ClockIcon className="mt-0.5 size-4 shrink-0 text-primary-500 dark:text-kiluan-mint" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

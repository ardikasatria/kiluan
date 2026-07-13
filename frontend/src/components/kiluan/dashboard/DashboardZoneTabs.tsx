'use client'

import clsx from 'clsx'

export interface DashboardZoneTab {
  id: string
  label: string
  hint: string
}

interface Props {
  zona: string
  onZonaChange: (zona: string) => void
  tabs: DashboardZoneTab[]
  ariaLabel: string
}

export default function DashboardZoneTabs({ zona, onZonaChange, tabs, ariaLabel }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="inline-flex rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-800/60"
        role="tablist"
        aria-label={ariaLabel}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={zona === tab.id}
            onClick={() => onZonaChange(tab.id)}
            className={clsx(
              'rounded-lg px-4 py-2 text-sm font-medium transition',
              zona === tab.id
                ? 'bg-white text-primary-800 shadow-sm dark:bg-neutral-900 dark:text-primary-100'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {tabs.find((t) => t.id === zona)?.hint}
      </p>
    </div>
  )
}

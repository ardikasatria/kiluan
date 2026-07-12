'use client'

import clsx from 'clsx'
import type { ReactNode } from 'react'

interface Props<T extends { id: string }> {
  items: T[]
  selectedId: string | null
  onSelect: (id: string) => void
  renderItem: (item: T, selected: boolean) => ReactNode
  loading?: boolean
  loadingMessage: string
  emptyMessage: string
  adaLagi?: boolean
  onLoadMore?: () => void
  loadMoreLabel?: string
  ariaLabel: string
}

export default function AntreanKurasi<T extends { id: string }>({
  items,
  selectedId,
  onSelect,
  renderItem,
  loading,
  loadingMessage,
  emptyMessage,
  adaLagi,
  onLoadMore,
  loadMoreLabel,
  ariaLabel,
}: Props<T>) {
  if (loading && items.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">{loadingMessage}</p>
  }

  if (items.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">{emptyMessage}</p>
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2" role="listbox" aria-label={ariaLabel}>
        {items.map((item) => {
          const selected = selectedId === item.id
          return (
            <li key={item.id} role="option" aria-selected={selected}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={clsx(
                  'w-full rounded-xl border px-4 py-3 text-left transition',
                  selected
                    ? 'border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/30'
                    : 'border-neutral-200 hover:border-primary-200 dark:border-neutral-700 dark:hover:border-primary-700',
                )}
              >
                {renderItem(item, selected)}
              </button>
            </li>
          )
        })}
      </ul>
      {adaLagi && onLoadMore && (
        <button
          type="button"
          onClick={onLoadMore}
          className="w-full rounded-lg border border-neutral-300 py-2 text-sm font-medium text-neutral-700 hover:border-primary-400 dark:border-neutral-600 dark:text-neutral-300"
        >
          {loadMoreLabel}
        </button>
      )}
    </div>
  )
}

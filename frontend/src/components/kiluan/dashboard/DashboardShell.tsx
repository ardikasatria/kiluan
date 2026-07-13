'use client'

import type { ReactNode } from 'react'

interface Props {
  sidebar: ReactNode
  topbar: ReactNode
  children: ReactNode
}

export default function DashboardShell({ sidebar, topbar, children }: Props) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white/60 shadow-sm backdrop-blur-sm dark:border-neutral-800/80 dark:bg-neutral-900/40">
      <div className="flex min-h-[min(70vh,640px)] flex-col lg:flex-row">
        <div
          id="dashboard-sidebar"
          className="hidden shrink-0 border-b border-neutral-200 lg:block lg:w-60 lg:border-r lg:border-b-0 xl:w-64 dark:border-neutral-800"
        >
          {sidebar}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          {topbar}
          <div className="flex-1 p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

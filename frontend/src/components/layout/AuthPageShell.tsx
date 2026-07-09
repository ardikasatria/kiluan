import Logo from '@/shared/Logo'
import clsx from 'clsx'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

/** Kerangka halaman auth di atas mesh gradient — logo + panel kaca. */
export default function AuthPageShell({ children, className }: Props) {
  return (
    <div className="container pb-16">
      <div className="my-10 flex justify-center sm:my-12">
        <Logo size="h-12 w-auto sm:h-14" />
      </div>
      <div className={clsx('mx-auto max-w-md kiluan-glass-panel space-y-6 p-6 sm:p-8', className)}>{children}</div>
    </div>
  )
}

import clsx from 'clsx'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

/** Latar mesh gradient sigerciv — mint → sea → teal → navy (light & dark). */
export default function KiluanMeshBackground({ children, className }: Props) {
  return <div className={clsx('kiluan-mesh-bg', className)}>{children}</div>
}

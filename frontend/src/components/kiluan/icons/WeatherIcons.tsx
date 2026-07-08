import clsx from 'clsx'

interface IconProps {
  className?: string
}

/** Ikon gelombang sederhana — cocok light/dark via currentColor */
export function WaveIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={clsx('size-5 shrink-0', className)}>
      <path
        d="M2 15c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 7 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M2 19c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 7 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.65"
      />
    </svg>
  )
}

export function WindIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={clsx('size-5 shrink-0', className)}>
      <path
        d="M4 8h11a3 3 0 1 0-3-3M4 16h13a3 3 0 1 1-3 3M4 12h16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

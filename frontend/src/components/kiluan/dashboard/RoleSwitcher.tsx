'use client'

import { daftarPeranPengguna, dasborHref, labelPeran, type PeranKode } from '@/lib/kiluan/peran'
import { useAuth } from '@/contexts/AuthProvider'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  desaSlug: string
  peranAktif: PeranKode
  className?: string
}

export default function RoleSwitcher({ desaSlug, peranAktif, className }: Props) {
  const { user } = useAuth()
  const pathname = usePathname()
  const peran = daftarPeranPengguna(user?.profil ?? null).filter((p) => p !== 'admin')

  if (peran.length <= 1) return null

  return (
    <div className={clsx('space-y-2', className)}>
      <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
        Ganti peran
      </p>
      <div className="flex flex-wrap gap-2">
        {peran.map((k) => {
          const href = dasborHref(desaSlug, k)
          const aktif = pathname.startsWith(href)
          return (
            <Link
              key={k}
              href={href}
              className={clsx(
                'rounded-full px-3 py-1 text-xs font-semibold transition',
                aktif
                  ? 'bg-primary-700 text-white dark:bg-primary-600'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-primary-100 hover:text-primary-800 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-primary-900/40',
              )}
            >
              {labelPeran(k)}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { daftarPeranPengguna, dasborHref, labelPeran, type PeranKode } from '@/lib/kiluan/peran'
import { useAuth } from '@/contexts/AuthProvider'
import { BuildingOffice2Icon, ChevronDownIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
  peranAktif: PeranKode
  className?: string
}

export default function DashboardContextSwitcher({ desaSlug, desaNama, peranAktif, className }: Props) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const t = useTranslations('dasbor.switcher')
  const tPeran = useTranslations('peran')
  const peran = daftarPeranPengguna(user?.profil ?? null).filter((p) =>
    peranAktif === 'admin' ? true : p !== 'admin',
  )

  const isAdmin = peranAktif === 'admin'

  return (
    <div className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-start text-sm transition hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-800/80 dark:hover:border-primary-600 sm:min-w-[220px]"
      >
        <BuildingOffice2Icon className="size-5 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-primary-800 dark:text-primary-100">
            {isAdmin ? t('lintasDesa') : desaNama}
          </span>
          <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
            {labelPeran(peranAktif, tPeran)}
          </span>
        </span>
        <ChevronDownIcon className={clsx('size-4 shrink-0 text-neutral-400 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30"
            aria-label={t('tutupPemilih')}
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            className="absolute top-full right-0 left-0 z-40 mt-1 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
          >
            {!isAdmin && (
              <p className="px-3 py-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">{t('desaAktif')}</p>
            )}
            {!isAdmin && (
              <div className="px-3 pb-2 text-sm font-medium text-primary-800 dark:text-primary-100">{desaNama}</div>
            )}
            {isAdmin && (
              <Link
                href="/admin/dasbor"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-primary-800 hover:bg-neutral-50 dark:text-primary-100 dark:hover:bg-neutral-800"
              >
                {t('stewardPlatform')}
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/teluk-kiluan/dasbor/pokdarwis"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {t('desaMitraPilot')}
              </Link>
            )}
            {peran.length > 1 && (
              <>
                <p className="mt-1 border-t border-neutral-100 px-3 py-2 text-xs font-medium tracking-wide text-neutral-500 uppercase dark:border-neutral-800">
                  {t('gantiPeran')}
                </p>
                {peran.map((k) => {
                  const href = dasborHref(desaSlug, k)
                  const aktif = pathname.startsWith(href)
                  return (
                    <Link
                      key={k}
                      href={href}
                      role="option"
                      aria-selected={aktif}
                      onClick={() => setOpen(false)}
                      className={clsx(
                        'block px-3 py-2 text-sm transition',
                        aktif
                          ? 'bg-primary-50 font-semibold text-primary-800 dark:bg-primary-900/40 dark:text-primary-100'
                          : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800',
                      )}
                    >
                      {labelPeran(k, tPeran)}
                    </Link>
                  )
                })}
              </>
            )}
            {peran.includes('admin') && peranAktif !== 'admin' && (
              <Link
                href="/admin/dasbor"
                onClick={() => setOpen(false)}
                className="block border-t border-neutral-100 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {t('adminSteward')}
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}

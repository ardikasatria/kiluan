'use client'

import { useAuth } from '@/contexts/AuthProvider'
import { Link } from '@/i18n/navigation'
import { dasborUtamaHref } from '@/lib/kiluan/peran'
import { useTranslations } from 'next-intl'

interface Props {
  desaSlug: string
}

/** Tombol navigasi shell kelola — dasbor sesuai peran aktif pengguna. */
export default function KelolaShellActions({ desaSlug }: Props) {
  const t = useTranslations('kelola.shell')
  const { user } = useAuth()
  const dasborHref = dasborUtamaHref(user?.profil ?? null, desaSlug)

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Link
        href={`/${desaSlug}`}
        className="inline-flex rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-primary-300 hover:text-primary-800 dark:border-neutral-600 dark:text-neutral-300 dark:hover:border-primary-600 dark:hover:text-primary-200"
      >
        {t('backEtalase')}
      </Link>
      <Link
        href={dasborHref}
        className="inline-flex rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-primary-300 hover:text-primary-800 dark:border-neutral-600 dark:text-neutral-300 dark:hover:border-primary-600 dark:hover:text-primary-200"
      >
        {t('backDasbor')}
      </Link>
    </div>
  )
}

'use client'

import { ADMIN_DEMO, DEMO_AKUN, DEMO_SANDI } from '@/lib/kiluan/demo-akun'
import { useTranslations } from 'next-intl'

type Props = {
  onPilih: (email: string, sandi: string) => void
}

export default function DemoAkunPanel({ onPilih }: Props) {
  const t = useTranslations('auth.masukPage.demoAkun')

  return (
    <div className="rounded-xl border border-dashed border-primary-300/60 bg-primary-50/50 p-4 dark:border-primary-700/50 dark:bg-primary-950/20">
      <p className="text-sm font-medium text-primary-900 dark:text-primary-100">{t('title')}</p>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
        {t('passwordHint', { sandi: DEMO_SANDI })}
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {DEMO_AKUN.map((akun) => (
          <li key={akun.kode}>
            <button
              type="button"
              onClick={() => onPilih(akun.email, DEMO_SANDI)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-sm transition hover:border-primary-400 hover:bg-primary-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-primary-600 dark:hover:bg-primary-950/40"
            >
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {t(`roles.${akun.labelKey}`)}
              </span>
              <span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-400">
                {akun.email}
              </span>
            </button>
          </li>
        ))}
        <li className="sm:col-span-2">
          <button
            type="button"
            onClick={() => onPilih(ADMIN_DEMO.email, ADMIN_DEMO.sandi)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-sm transition hover:border-primary-400 hover:bg-primary-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-primary-600 dark:hover:bg-primary-950/40"
          >
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {t(`roles.${ADMIN_DEMO.labelKey}`)}
            </span>
            <span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-400">
              {ADMIN_DEMO.email} · {t('adminPasswordHint', { sandi: ADMIN_DEMO.sandi })}
            </span>
          </button>
        </li>
      </ul>
    </div>
  )
}

'use client'

import { routing, type Locale } from '@/i18n/routing'
import { usePathname, useRouter } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import clsx from 'clsx'

interface Props {
  className?: string
}

export default function LocaleSwitcher({ className }: Props) {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('common.locale')

  function gantiBahasa(next: Locale) {
    if (next === locale) return
    router.replace(pathname, { locale: next })
  }

  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 p-0.5 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-800',
        className,
      )}
      role="group"
      aria-label={t('switchLabel')}
    >
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => gantiBahasa(loc)}
          className={clsx(
            'rounded-full px-2.5 py-1 transition',
            loc === locale
              ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
              : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200',
          )}
          aria-pressed={loc === locale}
        >
          {loc === 'id' ? t('shortId') : t('shortEn')}
        </button>
      ))}
    </div>
  )
}

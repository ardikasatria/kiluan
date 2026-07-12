'use client'

import AvatarDropdown from '@/components/Header/AvatarDropdown'
import NotifyDropdown from '@/components/Header/NotifyDropdown'
import WishlistHeaderButton from '@/components/Header/WishlistHeaderButton'
import { useAuth } from '@/contexts/AuthProvider'
import type { Locale } from '@/i18n/routing'
import { withLocale } from '@/lib/i18n/locale-path'
import { Button } from '@/shared/Button'
import SwitchDarkMode from '@/shared/SwitchDarkMode'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'

interface Props {
  className?: string
}

export default function AuthActions({ className }: Props) {
  const { isLoggedIn, isLoading } = useAuth()
  const locale = useLocale() as Locale
  const t = useTranslations('auth')

  return (
    <div className={clsx('flex items-center gap-x-1 sm:gap-x-2', className)}>
      <SwitchDarkMode className="hidden size-10 lg:inline-flex md:size-11" iconSize="size-5" />

      {isLoading ? (
        <div className="size-10 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700 md:size-11" />
      ) : isLoggedIn ? (
        <>
          <WishlistHeaderButton />
          <NotifyDropdown className="hidden sm:block" />
          <AvatarDropdown />
        </>
      ) : (
        <div className="flex items-center gap-x-2">
          <Button href={withLocale('/masuk', locale)} plain className="hidden px-4! sm:inline-flex">
            {t('masuk')}
          </Button>
          <Button href={withLocale('/daftar', locale)} color="primary" className="px-4! sm:px-5!">
            {t('daftar')}
          </Button>
        </div>
      )}
    </div>
  )
}

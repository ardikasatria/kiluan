'use client'

import AvatarDropdown from '@/components/Header/AvatarDropdown'
import NotifyDropdown from '@/components/Header/NotifyDropdown'
import { useAuth } from '@/contexts/AuthProvider'
import { Button } from '@/shared/Button'
import SwitchDarkMode from '@/shared/SwitchDarkMode'
import clsx from 'clsx'

interface Props {
  className?: string
}

export default function AuthActions({ className }: Props) {
  const { isLoggedIn, isLoading } = useAuth()

  return (
    <div className={clsx('flex items-center gap-x-1 sm:gap-x-2', className)}>
      <SwitchDarkMode className="size-10 md:size-11" iconSize="size-5" />

      {isLoading ? (
        <div className="size-10 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700 md:size-11" />
      ) : isLoggedIn ? (
        <>
          <NotifyDropdown className="hidden sm:block" />
          <AvatarDropdown />
        </>
      ) : (
        <div className="flex items-center gap-x-2">
          <Button href="/masuk" plain className="hidden px-4! sm:inline-flex">
            Masuk
          </Button>
          <Button href="/daftar" color="primary" className="px-4! sm:px-5!">
            Daftar
          </Button>
        </div>
      )}
    </div>
  )
}

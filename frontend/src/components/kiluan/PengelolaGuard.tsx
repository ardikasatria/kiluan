'use client'

import { useAuth } from '@/contexts/AuthProvider'
import { Link, useRouter } from '@/i18n/navigation'
import { withLocale } from '@/lib/i18n/locale-path'
import type { Locale } from '@/i18n/routing'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect } from 'react'

interface Props {
  desaSlug: string
  children: React.ReactNode
}

export default function PengelolaGuard({ desaSlug, children }: Props) {
  const { isLoggedIn, isPengelola, isLoading } = useAuth()
  const router = useRouter()
  const t = useTranslations('kelola.guard')
  const locale = useLocale() as Locale

  useEffect(() => {
    if (!isLoading && isLoggedIn && !isPengelola) {
      router.replace(`/${desaSlug}`)
    }
  }, [isLoggedIn, isPengelola, isLoading, desaSlug, router])

  if (isLoading) {
    return (
      <div className="container py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
        {t('loading')}
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-xl font-semibold text-primary-800 dark:text-primary-100">{t('title')}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
          {t('desc')}
        </p>
        <div className="mt-6">
          <ButtonPrimary href={withLocale(`/masuk?redirect=/${desaSlug}/kelola`, locale)}>
            {t('masuk')}
          </ButtonPrimary>
        </div>
      </div>
    )
  }

  if (!isPengelola) return null

  return <>{children}</>
}

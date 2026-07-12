'use client'

import MembershipStatusAlert from '@/components/kiluan/dashboard/MembershipStatusAlert'
import { useAuth } from '@/contexts/AuthProvider'
import { Link, useRouter } from '@/i18n/navigation'
import { withLocale } from '@/lib/i18n/locale-path'
import { bisaMasukKelola } from '@/lib/kiluan/kelola-akses'
import { dasborUtamaHref, keanggotaanKelolaTertunda, labelPeran } from '@/lib/kiluan/peran'
import type { Locale } from '@/i18n/routing'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect } from 'react'

interface Props {
  desaSlug: string
  desaId?: string | null
  desaNama: string
  children: React.ReactNode
}

/** Guard tingkat layout — login + keanggotaan aktif kelola di desa ini. */
export default function KelolaGuard({ desaSlug, desaId, desaNama, children }: Props) {
  const { isLoggedIn, isLoading, user } = useAuth()
  const router = useRouter()
  const t = useTranslations('kelola.guard')
  const tPeran = useTranslations('peran')
  const locale = useLocale() as Locale
  const profil = user?.profil ?? null
  const boleh = isLoggedIn && bisaMasukKelola(profil, desaId)
  const tertunda = !boleh ? keanggotaanKelolaTertunda(profil, desaId) : null

  useEffect(() => {
    if (!isLoading && isLoggedIn && !boleh && !tertunda) {
      router.replace(dasborUtamaHref(profil, desaSlug))
    }
  }, [isLoading, isLoggedIn, profil, desaSlug, router, boleh, tertunda])

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
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">{t('desc')}</p>
        <div className="mt-6">
          <ButtonPrimary href={withLocale(`/masuk?redirect=/${desaSlug}/kelola`, locale)}>
            {t('masuk')}
          </ButtonPrimary>
        </div>
      </div>
    )
  }

  if (tertunda) {
    return (
      <div className="container py-8 sm:py-12">
        <MembershipStatusAlert
          status={tertunda.status}
          peranLabel={labelPeran(tertunda.peran, tPeran)}
          desaNama={desaNama}
        />
        <Link
          href={dasborUtamaHref(profil, desaSlug)}
          className="mt-4 inline-block text-sm font-semibold text-primary-700 dark:text-primary-300"
        >
          {t('kembaliDasbor')}
        </Link>
      </div>
    )
  }

  if (!boleh) return null

  return <>{children}</>
}

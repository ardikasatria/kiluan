'use client'

import { useAuth } from '@/contexts/AuthProvider'
import {
  dasborUtamaHref,
  labelPeran,
  perluPemilihDasbor,
  punyaPeran,
  statusKeanggotaan,
  type PeranKode,
} from '@/lib/kiluan/peran'
import { RUTE_DASBOR } from '@/lib/kiluan/rute-sigerciv'
import { Link, useRouter } from '@/i18n/navigation'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { withLocale } from '@/lib/i18n/locale-path'
import type { Locale } from '@/i18n/routing'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect } from 'react'
import MembershipStatusAlert from './MembershipStatusAlert'

interface Props {
  desaSlug: string
  desaNama?: string
  peran?: PeranKode
  children: React.ReactNode
  loginOnly?: boolean
  redirectAfterLogin?: string
}

export default function DasborGuard({
  desaSlug,
  desaNama = 'Desa',
  peran,
  children,
  loginOnly,
  redirectAfterLogin,
}: Props) {
  const { isLoggedIn, isLoading, user } = useAuth()
  const router = useRouter()
  const t = useTranslations('dasbor.guard')
  const tPeran = useTranslations('peran')
  const locale = useLocale() as Locale
  const globalSigerciv = desaSlug === 'sigerciv'
  const dasborHub = globalSigerciv ? RUTE_DASBOR : `/${desaSlug}/dasbor`
  const loginRedirect = withLocale(redirectAfterLogin ?? dasborHub, locale)

  const statusPeran = peran ? statusKeanggotaan(user?.profil ?? null, peran) : null
  const boleh =
    loginOnly || !peran
      ? isLoggedIn
      : isLoggedIn && punyaPeran(user?.profil ?? null, peran)

  useEffect(() => {
    if (!isLoading && isLoggedIn && peran && !punyaPeran(user?.profil ?? null, peran)) {
      if (statusPeran === 'menunggu' || statusPeran === 'ditolak' || statusPeran === 'revisi') return
      const profil = user?.profil ?? null
      router.replace(
        perluPemilihDasbor(profil) ? dasborHub : dasborUtamaHref(profil, desaSlug),
      )
    }
  }, [isLoading, isLoggedIn, peran, user, desaSlug, router, statusPeran, dasborHub])

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center dark:border-neutral-700 dark:bg-neutral-800/60">
        <h1 className="text-xl font-semibold text-primary-800 dark:text-primary-100">{t('title')}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
          {t('desc')}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonPrimary href={withLocale(`/masuk?redirect=${encodeURIComponent(loginRedirect)}`, locale)}>
            {t('masuk')}
          </ButtonPrimary>
          <Link
            href="/daftar"
            className="inline-flex items-center rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium dark:border-neutral-600"
          >
            {t('daftar')}
          </Link>
        </div>
      </div>
    )
  }

  if (peran && (statusPeran === 'menunggu' || statusPeran === 'ditolak' || statusPeran === 'revisi')) {
    return (
      <div className="space-y-4">
        <MembershipStatusAlert
          status={statusPeran}
          peranLabel={labelPeran(peran, tPeran)}
          desaNama={desaNama}
        />
        <Link
          href={dasborHub}
          className="inline-block text-sm font-semibold text-primary-700 dark:text-primary-300"
        >
          {t('kembali')}
        </Link>
      </div>
    )
  }

  if (!boleh) return null

  return <>{children}</>
}

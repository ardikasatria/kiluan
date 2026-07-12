'use client'

import { useAuth } from '@/contexts/AuthProvider'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import {
  adalahPengelolaKonten,
  bolehAksesSegmenKelola,
  hanyaPenyediaDermaga,
  segmenKelola,
} from '@/lib/kiluan/kelola-akses'
import { dasborUtamaHref, punyaPeranDiDesa } from '@/lib/kiluan/peran'
import { ShieldExclamationIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

interface Props {
  desaSlug: string
  desaId?: string | null
  children: React.ReactNode
}

function landingPenyedia(
  desaSlug: string,
  profil: NonNullable<ReturnType<typeof useAuth>['user']>['profil'],
  desaId?: string | null,
) {
  if (punyaPeranDiDesa(profil, 'agen', desaId)) return `/${desaSlug}/kelola/slot`
  return `/${desaSlug}/kelola/pesanan`
}

/** Guard per halaman — cek segmen URL vs peran yang diizinkan di desa ini. */
export default function KelolaZonaGuard({ desaSlug, desaId, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const t = useTranslations('kelola.guard')
  const profil = user?.profil ?? null
  const segmen = segmenKelola(pathname)
  const boleh = bolehAksesSegmenKelola(profil, segmen, desaId)

  const arahkanPenyedia =
    !isLoading &&
    profil &&
    segmen === '' &&
    hanyaPenyediaDermaga(profil, desaId) &&
    !adalahPengelolaKonten(profil, desaId)

  useEffect(() => {
    if (arahkanPenyedia) {
      router.replace(landingPenyedia(desaSlug, profil, desaId))
    }
  }, [arahkanPenyedia, desaSlug, profil, desaId, router])

  if (isLoading || arahkanPenyedia) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
  }

  if (boleh) return <>{children}</>

  const dasbor = dasborUtamaHref(profil, desaSlug)

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-6 py-12 text-center dark:border-amber-900/60 dark:bg-amber-950/30">
      <ShieldExclamationIcon className="mx-auto size-10 text-amber-700 dark:text-amber-300" aria-hidden />
      <h2 className="mt-4 text-lg font-semibold text-amber-950 dark:text-amber-100">{t('forbiddenTitle')}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-amber-900/90 dark:text-amber-200/90">
        {t('forbiddenDesc')}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={dasbor}
          className="rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 dark:bg-primary-600"
        >
          {t('kembaliDasbor')}
        </Link>
        {profil && hanyaPenyediaDermaga(profil, desaId) && (
          <Link
            href={landingPenyedia(desaSlug, profil, desaId)}
            className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium dark:border-neutral-600 dark:text-neutral-200"
          >
            {t('keDermaga')}
          </Link>
        )}
        {adalahPengelolaKonten(profil, desaId) && (
          <Link
            href={`/${desaSlug}/kelola`}
            className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium dark:border-neutral-600 dark:text-neutral-200"
          >
            {t('kembaliKelola')}
          </Link>
        )}
      </div>
    </div>
  )
}

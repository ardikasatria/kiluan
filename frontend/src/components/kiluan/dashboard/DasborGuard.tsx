'use client'

import { useAuth } from '@/contexts/AuthProvider'
import { punyaPeran, type PeranKode } from '@/lib/kiluan/peran'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface Props {
  desaSlug: string
  peran?: PeranKode
  children: React.ReactNode
  /** true = hanya butuh login (hub wisatawan) */
  loginOnly?: boolean
}

export default function DasborGuard({ desaSlug, peran, children, loginOnly }: Props) {
  const { isLoggedIn, isLoading, user } = useAuth()
  const router = useRouter()

  const boleh =
    loginOnly || !peran
      ? isLoggedIn
      : isLoggedIn && punyaPeran(user?.profil ?? null, peran)

  useEffect(() => {
    if (!isLoading && isLoggedIn && peran && !punyaPeran(user?.profil ?? null, peran)) {
      router.replace(`/${desaSlug}/dasbor`)
    }
  }, [isLoading, isLoggedIn, peran, user, desaSlug, router])

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">Memuat sesi…</div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold text-primary-800 dark:text-primary-100">Dasbor sigerciv</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
          Masuk untuk mengakses dasbor sesuai peran keanggotaan Anda.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonPrimary href={`/masuk?redirect=/${desaSlug}/dasbor`}>Masuk</ButtonPrimary>
          <Link
            href="/daftar"
            className="inline-flex items-center rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium dark:border-neutral-600"
          >
            Daftar
          </Link>
        </div>
      </div>
    )
  }

  if (!boleh) return null

  return <>{children}</>
}

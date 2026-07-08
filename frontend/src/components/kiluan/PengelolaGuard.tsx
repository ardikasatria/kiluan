'use client'

import { useAuth } from '@/contexts/AuthProvider'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface Props {
  desaSlug: string
  children: React.ReactNode
}

export default function PengelolaGuard({ desaSlug, children }: Props) {
  const { isLoggedIn, isPengelola, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isLoggedIn && !isPengelola) {
      router.replace(`/${desaSlug}`)
    }
  }, [isLoggedIn, isPengelola, isLoading, desaSlug, router])

  if (isLoading) {
    return (
      <div className="container py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Memuat sesi…
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-xl font-semibold text-primary-800 dark:text-primary-100">Area Pengelola</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
          Masuk dengan akun yang memiliki peran pokdarwis, perangkat desa, atau admin.
        </p>
        <div className="mt-6">
          <ButtonPrimary href={`/masuk?redirect=/${desaSlug}/kelola`}>Masuk</ButtonPrimary>
        </div>
      </div>
    )
  }

  if (!isPengelola) return null

  return <>{children}</>
}

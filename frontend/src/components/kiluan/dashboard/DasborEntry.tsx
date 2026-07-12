'use client'

import { useAuth } from '@/contexts/AuthProvider'
import { dasborUtamaHref, perluPemilihDasbor } from '@/lib/kiluan/peran'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DasborHub from './DasborHub'

interface Props {
  desaSlug: string
  profilNama: string
}

export default function DasborEntry({ desaSlug, profilNama }: Props) {
  const { user, isLoading, isLoggedIn } = useAuth()
  const router = useRouter()

  const tunggal =
    isLoggedIn && user?.profil && !perluPemilihDasbor(user.profil)
  const tujuan = tunggal ? dasborUtamaHref(user!.profil, desaSlug) : null

  useEffect(() => {
    if (isLoading || !isLoggedIn || !tujuan) return
    if (tujuan !== `/${desaSlug}/dasbor`) {
      router.replace(tujuan)
    }
  }, [isLoading, isLoggedIn, tujuan, desaSlug, router])

  if (isLoading || tunggal) {
    return (
      <div className="py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Memuat dasbor…
      </div>
    )
  }

  return <DasborHub desaSlug={desaSlug} profilNama={profilNama} />
}

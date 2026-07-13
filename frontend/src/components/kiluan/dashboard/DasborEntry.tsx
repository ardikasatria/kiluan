'use client'

import { useAuth } from '@/contexts/AuthProvider'
import { dasborUtamaHref, pathPemilihDasbor, perluPemilihDasbor } from '@/lib/kiluan/peran'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import DasborHub from './DasborHub'

interface Props {
  desaSlug?: string
  profilNama?: string
  /** Hub lintas desa (Sigerciv Lampung), bukan satu desa */
  lintasDesa?: boolean
}

export default function DasborEntry({ desaSlug = 'teluk-kiluan', profilNama, lintasDesa }: Props) {
  const { user, isLoading, isLoggedIn } = useAuth()
  const router = useRouter()
  const t = useTranslations('dasbor.entry')

  const tunggal =
    isLoggedIn && user?.profil && !perluPemilihDasbor(user.profil)
  const tujuan = tunggal ? dasborUtamaHref(user!.profil, desaSlug) : null
  const hubPath = pathPemilihDasbor(lintasDesa ? 'sigerciv' : desaSlug)

  useEffect(() => {
    if (isLoading || !isLoggedIn || !tujuan) return
    if (tujuan !== hubPath) {
      router.replace(tujuan)
    }
  }, [isLoading, isLoggedIn, tujuan, hubPath, router])

  if (isLoading || tunggal) {
    return (
      <div className="py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
        {t('loading')}
      </div>
    )
  }

  return <DasborHub desaSlug={desaSlug} profilNama={profilNama} lintasDesa={lintasDesa} />
}

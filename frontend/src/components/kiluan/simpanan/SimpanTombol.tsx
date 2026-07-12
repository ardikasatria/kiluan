'use client'

import { useAuth } from '@/contexts/AuthProvider'
import { useRouter } from '@/i18n/navigation'
import {
  cekStatusSimpanan,
  hapusSimpananAman,
  tambahSimpananAman,
  type SimpananTipe,
} from '@/lib/api/simpanan'
import { pesanGalat } from '@/lib/api/galat'
import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  tipe: SimpananTipe
  entitasId: string
  desaSlug: string
  className?: string
  size?: 'sm' | 'md'
  /** Mencegah klik membuka parent link */
  onParentClick?: boolean
}

export default function SimpanTombol({
  tipe,
  entitasId,
  desaSlug,
  className,
  size = 'md',
  onParentClick = true,
}: Props) {
  const { isLoggedIn } = useAuth()
  const router = useRouter()
  const t = useTranslations('simpanan')
  const [disimpan, setDisimpan] = useState(false)
  const [simpananId, setSimpananId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [memuat, setMemuat] = useState(true)

  const muatStatus = useCallback(async () => {
    if (!isLoggedIn) {
      setMemuat(false)
      return
    }
    try {
      const res = await cekStatusSimpanan(tipe, [entitasId])
      const row = res[0]
      setDisimpan(row?.disimpan ?? false)
      setSimpananId(row?.simpanan_id ?? null)
    } catch {
      /* abaikan */
    } finally {
      setMemuat(false)
    }
  }, [isLoggedIn, tipe, entitasId])

  useEffect(() => {
    void muatStatus()
  }, [muatStatus])

  async function toggle(e: React.MouseEvent) {
    if (onParentClick) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!isLoggedIn) {
      router.push(`/masuk?redirect=/${desaSlug}`)
      return
    }
    if (loading) return

    const sebelum = disimpan
    const idSebelum = simpananId
    setLoading(true)
    setDisimpan(!sebelum)

    try {
      if (sebelum && idSebelum) {
        await hapusSimpananAman(desaSlug, idSebelum)
        setSimpananId(null)
      } else {
        const res = await tambahSimpananAman(desaSlug, { tipe, entitas_id: entitasId })
        if ('offline' in res && res.offline) {
          setSimpananId('offline')
        } else if ('id' in res) {
          setSimpananId(res.id)
        }
      }
    } catch (err) {
      setDisimpan(sebelum)
      setSimpananId(idSebelum)
      console.warn(pesanGalat(err))
    } finally {
      setLoading(false)
    }
  }

  const iconSize = size === 'sm' ? 'size-5' : 'size-6'
  const btnSize = size === 'sm' ? 'size-9' : 'size-10'

  return (
    <button
      type="button"
      onClick={(e) => void toggle(e)}
      disabled={memuat || loading}
      aria-pressed={disimpan}
      aria-label={disimpan ? t('removeFromWishlist') : t('addToWishlist')}
      className={clsx(
        'inline-flex items-center justify-center rounded-full backdrop-blur-sm transition focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none',
        btnSize,
        disimpan
          ? 'bg-primary-600/90 text-white hover:bg-primary-700 dark:bg-primary-500/90'
          : 'bg-white/90 text-neutral-600 hover:bg-white hover:text-primary-600 dark:bg-neutral-900/80 dark:text-neutral-300 dark:hover:text-primary-400',
        (memuat || loading) && 'opacity-60',
        className,
      )}
    >
      {disimpan ? (
        <HeartSolidIcon className={iconSize} aria-hidden />
      ) : (
        <HeartIcon className={iconSize} aria-hidden />
      )}
    </button>
  )
}

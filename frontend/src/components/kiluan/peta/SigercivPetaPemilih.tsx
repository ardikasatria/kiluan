'use client'

import type { Lokasi } from '@/lib/api/types'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'

export type TipeMarkerPeta = 'desa' | 'destinasi'

export interface MarkerPeta {
  id: string
  nama: string
  lokasi: Lokasi
  tipe: TipeMarkerPeta
  href?: string
  sublabel?: string
}

interface Props {
  markers: MarkerPeta[]
  center?: Lokasi
  zoom?: number
  highlightedId?: string | null
  className?: string
  emptyLabel?: string
  onMarkerClick?: (id: string) => void
  onMarkerHover?: (id: string | null) => void
}

function MapLoading() {
  const t = useTranslations('map')
  return (
    <div
      className="flex h-full min-h-[280px] w-full items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/60"
      role="status"
      aria-label={t('loading')}
    >
      <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</span>
    </div>
  )
}

const SigercivPetaPemilihClient = dynamic(() => import('./SigercivPetaPemilihClient'), {
  ssr: false,
  loading: () => <MapLoading />,
})

/** Peta pemilih desa/destinasi — reusable di Jelajah, onboarding, switcher desa. */
export default function SigercivPetaPemilih({
  markers,
  emptyLabel,
  ...props
}: Props) {
  const t = useTranslations('map')
  const label = emptyLabel ?? t('empty')

  if (markers.length === 0) {
    return (
      <div
        className={`flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 px-6 text-center text-sm text-neutral-500 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-400 ${props.className ?? ''}`}
      >
        {label}
      </div>
    )
  }

  return <SigercivPetaPemilihClient markers={markers} {...props} />
}

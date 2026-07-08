'use client'

import type { Lokasi } from '@/lib/api/types'
import dynamic from 'next/dynamic'

export interface MapMarker {
  id: string
  nama: string
  lokasi: Lokasi
  href?: string
}

interface Props {
  markers: MapMarker[]
  center?: Lokasi
  className?: string
}

const DiscoveryMapClient = dynamic(() => import('./DiscoveryMapClient'), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[280px] w-full rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/60" />
  ),
})

export default function DiscoveryMap(props: Props) {
  if (props.markers.length === 0) return null
  return <DiscoveryMapClient {...props} />
}

'use client'

import type { Lokasi } from '@/lib/api/types'
import dynamic from 'next/dynamic'

interface Props {
  lokasi: Lokasi
  nama: string
  className?: string
}

const SpotMapClient = dynamic(() => import('./SpotMapClient'), {
  ssr: false,
  loading: () => <div className="h-56 w-full rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/60 sm:h-72" />,
})

export default function SpotMap(props: Props) {
  return <SpotMapClient {...props} />
}

'use client'

import type { Lokasi } from '@/lib/api/types'
import dynamic from 'next/dynamic'

interface Props {
  value: Lokasi
  onChange: (loc: Lokasi) => void
  className?: string
}

const MapPickerClient = dynamic(() => import('./MapPickerClient'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-500 dark:border-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400 sm:h-80">
      Memuat peta...
    </div>
  ),
})

export default function MapPicker(props: Props) {
  return <MapPickerClient {...props} />
}

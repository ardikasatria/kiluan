'use client'

import type { Lokasi } from '@/lib/api/types'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'

interface Props {
  value: Lokasi
  onChange: (loc: Lokasi) => void
  area?: Lokasi[]
  onAreaChange?: (vertices: Lokasi[]) => void
  className?: string
}

function MapPickerLoading() {
  const t = useTranslations('map')
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-500 dark:border-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400 sm:h-80">
      {t('loadingPicker')}
    </div>
  )
}

const MapPickerClient = dynamic(() => import('./MapPickerClient'), {
  ssr: false,
  loading: () => <MapPickerLoading />,
})

export default function MapPicker(props: Props) {
  return <MapPickerClient {...props} />
}

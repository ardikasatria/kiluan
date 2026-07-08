'use client'

import type { MediaItem } from '@/lib/api/types'
import dynamic from 'next/dynamic'

const SpotGalleryClient = dynamic(() => import('./SpotGalleryClient'), {
  ssr: false,
  loading: () => (
    <div className="aspect-[21/9] min-h-[200px] w-full animate-pulse bg-neutral-200 dark:bg-neutral-800 sm:min-h-[280px]" />
  ),
})

interface Props {
  nama: string
  media: MediaItem[]
  kategori?: string | null
}

export default function SpotGallery(props: Props) {
  return <SpotGalleryClient {...props} />
}

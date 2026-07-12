'use client'

import SimpanTombol from '@/components/kiluan/simpanan/SimpanTombol'
import { useTranslations } from 'next-intl'

interface Props {
  destinasiId: string
  desaSlug: string
  nama: string
}

export default function SpotSimpanBar({ destinasiId, desaSlug, nama }: Props) {
  const t = useTranslations('simpanan')

  return (
    <div className="flex items-center gap-3">
      <SimpanTombol tipe="destinasi" entitasId={destinasiId} desaSlug={desaSlug} onParentClick={false} />
      <span className="text-sm text-neutral-600 dark:text-neutral-400">{t('saveToWishlist', { nama })}</span>
    </div>
  )
}

'use client'

import SimpanTombol from '@/components/kiluan/simpanan/SimpanTombol'

interface Props {
  destinasiId: string
  desaSlug: string
  nama: string
}

export default function SpotSimpanBar({ destinasiId, desaSlug, nama }: Props) {
  return (
    <div className="flex items-center gap-3">
      <SimpanTombol tipe="destinasi" entitasId={destinasiId} desaSlug={desaSlug} onParentClick={false} />
      <span className="text-sm text-neutral-600 dark:text-neutral-400">
        Simpan <span className="font-medium text-neutral-800 dark:text-neutral-200">{nama}</span> ke wishlist
      </span>
    </div>
  )
}

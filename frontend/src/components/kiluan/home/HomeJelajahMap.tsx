'use client'

import SigercivPetaPemilih, { type MarkerPeta } from '@/components/kiluan/peta/SigercivPetaPemilih'
import type { DesaRingkas, DestinasiRingkas } from '@/lib/api/types'
import { PUSAT_LAMPUNG } from '@/lib/kiluan/jelajah-params'
import { useMemo } from 'react'

interface Props {
  desa: DesaRingkas[]
  destinasi?: DestinasiRingkas[]
}

export default function HomeJelajahMap({ desa, destinasi = [] }: Props) {
  const markers: MarkerPeta[] = useMemo(() => {
    const desaMarkers = desa
      .filter((d) => d.lokasi)
      .map((d) => ({
        id: `desa-${d.slug}`,
        nama: d.nama,
        lokasi: d.lokasi!,
        tipe: 'desa' as const,
        href: `/${d.slug}`,
      }))

    if (desaMarkers.length) return desaMarkers

    return destinasi
      .filter((d) => d.lokasi)
      .map((d) => ({
        id: d.id,
        nama: d.nama,
        lokasi: d.lokasi!,
        tipe: 'destinasi' as const,
        href: `/${d.desa_slug ?? 'teluk-kiluan'}/spot/${d.slug}`,
      }))
  }, [desa, destinasi])

  return (
    <SigercivPetaPemilih
      markers={markers}
      center={PUSAT_LAMPUNG}
      zoom={markers.length <= 1 ? 10 : 8}
      className="h-full min-h-[260px] rounded-none border-0 shadow-none lg:min-h-[320px]"
    />
  )
}

'use client'

import 'leaflet/dist/leaflet.css'
import type { Lokasi } from '@/lib/api/types'
import L from 'leaflet'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface Props {
  lokasi: Lokasi
  nama: string
  className?: string
}

export default function SpotMap({ lokasi, nama, className }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted || !lokasi) return null

  return (
    <div className={`overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 ${className ?? ''}`}>
      <MapContainer
        center={[lokasi.lat, lokasi.lng]}
        zoom={14}
        className="h-56 w-full sm:h-72 [&_.leaflet-tile-pane]:brightness-[0.95] dark:[&_.leaflet-tile-pane]:brightness-[0.65] dark:[&_.leaflet-tile-pane]:contrast-125"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lokasi.lat, lokasi.lng]} icon={icon} />
      </MapContainer>
      <p className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400">Lokasi: {nama}</p>
    </div>
  )
}

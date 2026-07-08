'use client'

import 'leaflet/dist/leaflet.css'
import type { Lokasi } from '@/lib/api/types'
import L from 'leaflet'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'

const KILUAN: Lokasi = { lat: -5.7912, lng: 105.1033 }

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function ClickHandler({ onPick }: { onPick: (loc: Lokasi) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

interface Props {
  value: Lokasi
  onChange: (loc: Lokasi) => void
  className?: string
}

export default function MapPicker({ value, onChange, className }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div
        className={`flex h-64 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-500 dark:border-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400 sm:h-80 ${className ?? ''}`}
      >
        Memuat peta…
      </div>
    )
  }

  const center = value.lat ? value : KILUAN

  return (
    <div className={`overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700 ${className ?? ''}`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        className="h-64 w-full sm:h-80 [&_.leaflet-tile-pane]:brightness-[0.95] dark:[&_.leaflet-tile-pane]:brightness-[0.65] dark:[&_.leaflet-tile-pane]:contrast-125"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onChange} />
        <Marker position={[value.lat || center.lat, value.lng || center.lng]} icon={icon} />
      </MapContainer>
      <p className="border-t border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-400">
        Ketuk peta untuk menempatkan titik · {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
      </p>
    </div>
  )
}

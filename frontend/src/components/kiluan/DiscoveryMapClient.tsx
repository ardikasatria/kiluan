'use client'

import 'leaflet/dist/leaflet.css'
import type { Lokasi } from '@/lib/api/types'
import L from 'leaflet'
import Link from 'next/link'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import type { MapMarker } from './DiscoveryMap'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface Props {
  markers: MapMarker[]
  center?: Lokasi
  className?: string
}

export default function DiscoveryMapClient({ markers, center, className }: Props) {
  const defaultCenter = center ?? markers[0]?.lokasi ?? { lat: -5.79, lng: 105.1 }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 ${className ?? ''}`}
    >
      <MapContainer
        center={[defaultCenter.lat, defaultCenter.lng]}
        zoom={11}
        className="h-full min-h-[280px] w-full [&_.leaflet-tile-pane]:brightness-[0.95] dark:[&_.leaflet-tile-pane]:brightness-[0.65] dark:[&_.leaflet-tile-pane]:contrast-125"
        scrollWheelZoom={false}
      >
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lokasi.lat, m.lokasi.lng]} icon={icon}>
            <Popup>
              <p className="font-medium text-neutral-900">{m.nama}</p>
              {m.href ? (
                <Link href={m.href} className="mt-1 inline-block text-sm text-primary-700 hover:underline">
                  Lihat detail
                </Link>
              ) : null}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

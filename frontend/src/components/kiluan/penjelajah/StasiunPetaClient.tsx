'use client'

import 'leaflet/dist/leaflet.css'
import type { Lokasi } from '@/lib/api/types'
import L from 'leaflet'
import { useTranslations } from 'next-intl'
import { Circle, MapContainer, Marker, TileLayer } from 'react-leaflet'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const userIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,.4)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

interface Props {
  stasiun: Lokasi
  nama: string
  radiusM?: number
  userLoc?: Lokasi | null
  className?: string
}

export default function StasiunPetaClient({ stasiun, nama, radiusM, userLoc, className }: Props) {
  const t = useTranslations('misi.detail')

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 ${className ?? ''}`}
    >
      <MapContainer
        center={[stasiun.lat, stasiun.lng]}
        zoom={15}
        className="h-56 w-full sm:h-64 [&_.leaflet-tile-pane]:brightness-[0.95] dark:[&_.leaflet-tile-pane]:brightness-[0.65] dark:[&_.leaflet-tile-pane]:contrast-125"
        scrollWheelZoom={false}
      >
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[stasiun.lat, stasiun.lng]} icon={icon} />
        {userLoc && <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon} />}
        {radiusM != null && radiusM > 0 && (
          <Circle center={[stasiun.lat, stasiun.lng]} radius={radiusM} pathOptions={{ color: '#059669', fillOpacity: 0.12 }} />
        )}
      </MapContainer>
      <p className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400">{t('mapCaption', { nama })}</p>
    </div>
  )
}

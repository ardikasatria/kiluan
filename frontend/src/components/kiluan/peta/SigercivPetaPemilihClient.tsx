'use client'

import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

import { Link } from '@/i18n/navigation'
import type { Lokasi } from '@/lib/api/types'
import L from 'leaflet'
import 'leaflet.markercluster'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import type { MarkerPeta } from './SigercivPetaPemilih'

const iconDesa = L.divIcon({
  className: '',
  html: `<span style="display:flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:9999px;background:#124170;border:2px solid #aaffc7;box-shadow:0 2px 8px rgba(0,0,0,.25)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg></span>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const iconDestinasi = L.divIcon({
  className: '',
  html: `<span style="display:flex;width:24px;height:24px;align-items:center;justify-content:center;border-radius:9999px;background:#67c090;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.2)"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="white" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></span>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const iconDestinasiHighlight = L.divIcon({
  className: '',
  html: `<span style="display:flex;width:30px;height:30px;align-items:center;justify-content:center;border-radius:9999px;background:#124170;border:3px solid #aaffc7;box-shadow:0 0 0 4px rgba(170,255,199,.35)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

interface Props {
  markers: MarkerPeta[]
  center?: Lokasi
  zoom?: number
  highlightedId?: string | null
  className?: string
  onMarkerClick?: (id: string) => void
  onMarkerHover?: (id: string | null) => void
}

function ClusterMarkers({
  markers,
  highlightedId,
  onMarkerClick,
  onMarkerHover,
  viewDetailLabel,
}: Pick<Props, 'markers' | 'highlightedId' | 'onMarkerClick' | 'onMarkerHover'> & {
  viewDetailLabel: string
}) {
  const map = useMap()
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)

  useEffect(() => {
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    })
    clusterRef.current = cluster
    map.addLayer(cluster)
    return () => {
      map.removeLayer(cluster)
      clusterRef.current = null
    }
  }, [map])

  useEffect(() => {
    const cluster = clusterRef.current
    if (!cluster) return
    cluster.clearLayers()

    markers.forEach((m) => {
      const highlighted = m.id === highlightedId
      const icon =
        m.tipe === 'desa'
          ? iconDesa
          : highlighted
            ? iconDestinasiHighlight
            : iconDestinasi

      const marker = L.marker([m.lokasi.lat, m.lokasi.lng], { icon })
      const popupHtml = `
        <div style="min-width:140px">
          <p style="font-weight:600;margin:0 0 4px;color:#124170">${m.nama}</p>
          ${m.sublabel ? `<p style="font-size:12px;margin:0 0 6px;color:#6b7280">${m.sublabel}</p>` : ''}
          ${m.href ? `<a href="${m.href}" style="font-size:13px;color:#215b63;font-weight:600">${viewDetailLabel}</a>` : ''}
        </div>
      `
      marker.bindPopup(popupHtml)
      marker.on('click', () => onMarkerClick?.(m.id))
      marker.on('mouseover', () => onMarkerHover?.(m.id))
      marker.on('mouseout', () => onMarkerHover?.(null))
      cluster.addLayer(marker)
    })
  }, [markers, highlightedId, onMarkerClick, onMarkerHover, viewDetailLabel])

  return null
}

export default function SigercivPetaPemilihClient({
  markers,
  center,
  zoom = 9,
  highlightedId,
  className,
  onMarkerClick,
  onMarkerHover,
}: Props) {
  const t = useTranslations('map')
  const defaultCenter = useMemo(
    () => center ?? markers[0]?.lokasi ?? { lat: -5.45, lng: 105.27 },
    [center, markers],
  )

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-neutral-200 shadow-sm dark:border-neutral-700 ${className ?? ''}`}
      role="application"
      aria-label={t('interactiveLabel')}
    >
      <MapContainer
        center={[defaultCenter.lat, defaultCenter.lng]}
        zoom={zoom}
        className="h-full min-h-[280px] w-full [&_.leaflet-tile-pane]:brightness-[0.95] dark:[&_.leaflet-tile-pane]:brightness-[0.65] dark:[&_.leaflet-tile-pane]:contrast-125"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClusterMarkers
          markers={markers}
          highlightedId={highlightedId}
          onMarkerClick={onMarkerClick}
          onMarkerHover={onMarkerHover}
          viewDetailLabel={t('viewDetail')}
        />
      </MapContainer>
      <p className="sr-only">{t('keyboardHint')}</p>
      {markers.some((m) => m.href) ? (
        <ul className="sr-only">
          {markers.map((m) =>
            m.href ? (
              <li key={m.id}>
                <Link href={m.href}>{m.nama}</Link>
              </li>
            ) : null,
          )}
        </ul>
      ) : null}
    </div>
  )
}

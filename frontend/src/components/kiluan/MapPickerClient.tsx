'use client'

import 'leaflet/dist/leaflet.css'
import type { Lokasi } from '@/lib/api/types'
import L from 'leaflet'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { MapContainer, Marker, Polygon, TileLayer, useMapEvents } from 'react-leaflet'

const KILUAN: Lokasi = { lat: -5.7912, lng: 105.1033 }

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function MapEvents({
  polygonMode,
  onPick,
  onAddVertex,
}: {
  polygonMode: boolean
  onPick: (loc: Lokasi) => void
  onAddVertex: (loc: Lokasi) => void
}) {
  useMapEvents({
    click(e) {
      const loc = { lat: e.latlng.lat, lng: e.latlng.lng }
      if (polygonMode) onAddVertex(loc)
      else onPick(loc)
    },
  })
  return null
}

interface Props {
  value: Lokasi
  onChange: (loc: Lokasi) => void
  area?: Lokasi[]
  onAreaChange?: (vertices: Lokasi[]) => void
  className?: string
}

export default function MapPickerClient({ value, onChange, area = [], onAreaChange, className }: Props) {
  const t = useTranslations('map')
  const [polygonMode, setPolygonMode] = useState(false)
  const [latInput, setLatInput] = useState(String(value.lat))
  const [lngInput, setLngInput] = useState(String(value.lng))
  const center = value.lat ? value : KILUAN
  const showPolygon = Boolean(onAreaChange)

  const applyManual = useCallback(() => {
    const lat = Number.parseFloat(latInput)
    const lng = Number.parseFloat(lngInput)
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) onChange({ lat, lng })
  }, [latInput, lngInput, onChange])

  const tambahVertex = useCallback(
    (loc: Lokasi) => {
      if (!onAreaChange) return
      onAreaChange([...area, loc])
    },
    [area, onAreaChange],
  )

  const selesaiPoligon = () => setPolygonMode(false)

  const hapusArea = () => {
    onAreaChange?.([])
    setPolygonMode(false)
  }

  const undoVertex = () => {
    if (area.length) onAreaChange?.(area.slice(0, -1))
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700 ${className ?? ''}`}>
      {showPolygon && (
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800/80">
          <button
            type="button"
            onClick={() => setPolygonMode((m) => !m)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              polygonMode
                ? 'bg-primary-700 text-white'
                : 'border border-neutral-300 text-neutral-700 dark:border-neutral-600 dark:text-neutral-300'
            }`}
          >
            {polygonMode ? t('polygonDrawing') : t('polygonStart')}
          </button>
          {polygonMode && (
            <button
              type="button"
              onClick={selesaiPoligon}
              className="rounded-full border border-primary-400 px-3 py-1 text-xs font-medium text-primary-800 dark:text-primary-200"
            >
              {t('polygonDone')}
            </button>
          )}
          {area.length > 0 && (
            <>
              <button
                type="button"
                onClick={undoVertex}
                className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-600 dark:border-neutral-600 dark:text-neutral-400"
              >
                {t('polygonUndo')}
              </button>
              <button
                type="button"
                onClick={hapusArea}
                className="rounded-full border border-red-300 px-3 py-1 text-xs text-red-700 dark:border-red-800 dark:text-red-300"
              >
                {t('polygonClear')}
              </button>
            </>
          )}
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('polygonVertices', { count: area.length })}
          </span>
        </div>
      )}

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
        <MapEvents polygonMode={polygonMode && showPolygon} onPick={onChange} onAddVertex={tambahVertex} />
        <Marker
          position={[value.lat || center.lat, value.lng || center.lng]}
          icon={icon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const pos = e.target.getLatLng()
              const loc = { lat: pos.lat, lng: pos.lng }
              onChange(loc)
              setLatInput(String(loc.lat))
              setLngInput(String(loc.lng))
            },
          }}
        />
        {area.length >= 2 && (
          <Polygon
            positions={area.map((v) => [v.lat, v.lng] as [number, number])}
            pathOptions={{ color: '#15803d', fillOpacity: 0.15 }}
          />
        )}
      </MapContainer>

      <div className="border-t border-neutral-200 bg-neutral-50 px-3 py-3 dark:border-neutral-700 dark:bg-neutral-800/80">
        <p className="text-xs text-neutral-600 dark:text-neutral-400">{t('pickHint', { lat: value.lat.toFixed(5), lng: value.lng.toFixed(5) })}</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-xs text-neutral-600 dark:text-neutral-400">
            {t('latLabel')}
            <input
              type="number"
              step="any"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              className="mt-1 block w-28 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
          </label>
          <label className="text-xs text-neutral-600 dark:text-neutral-400">
            {t('lngLabel')}
            <input
              type="number"
              step="any"
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              className="mt-1 block w-28 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
          </label>
          <button
            type="button"
            onClick={applyManual}
            className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600"
          >
            {t('applyCoords')}
          </button>
        </div>
      </div>
    </div>
  )
}

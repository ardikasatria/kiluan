'use client'

import DesaCard from '@/components/kiluan/DesaCard'
import DestinasiCard from '@/components/kiluan/DestinasiCard'
import DiscoveryMap from '@/components/kiluan/DiscoveryMap'
import { cariDestinasiDiscovery, daftarDesaDiscovery } from '@/lib/api/discovery'
import type { DesaRingkas, DestinasiRingkas, Kategori, MetaPaginasi } from '@/lib/api/types'
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  MagnifyingGlassIcon,
  MapIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useCallback, useMemo, useState, useTransition } from 'react'

type Tab = 'destinasi' | 'desa'

interface Props {
  initialDestinasi: DestinasiRingkas[]
  initialDesa: DesaRingkas[]
  metaDestinasi: MetaPaginasi
  metaDesa: MetaPaginasi
  kategori: Kategori[]
  initialQ?: string
  initialTab?: Tab
  initialKategoriId?: number
}

export default function DiscoveryExplorer({
  initialDestinasi,
  initialDesa,
  metaDestinasi,
  metaDesa,
  kategori,
  initialQ = '',
  initialTab = 'destinasi',
  initialKategoriId,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [q, setQ] = useState(initialQ)
  const [kategoriId, setKategoriId] = useState<number | ''>(initialKategoriId ?? '')
  const [desaSlug, setDesaSlug] = useState('')
  const [dekat, setDekat] = useState<string | undefined>()
  const [destinasi, setDestinasi] = useState(initialDestinasi)
  const [desa, setDesa] = useState(initialDesa)
  const [metaD, setMetaD] = useState(metaDestinasi)
  const [metaDs, setMetaDs] = useState(metaDesa)
  const [pending, startTransition] = useTransition()
  const [geoLoading, setGeoLoading] = useState(false)

  const kategoriMap = useMemo(() => new Map(kategori.map((k) => [k.id, k])), [kategori])

  const fetchDestinasi = useCallback(
    (append = false, kursor?: string | null) => {
      startTransition(async () => {
        const res = await cariDestinasiDiscovery({
          q: q || undefined,
          kategori: kategoriId || undefined,
          desa: desaSlug || undefined,
          dekat,
          radius_m: dekat ? 50000 : undefined,
          batas: 12,
          kursor: append ? (kursor ?? undefined) : undefined,
        })
        setDestinasi((prev) => (append ? [...prev, ...res.item] : res.item))
        setMetaD(res.meta)
      })
    },
    [q, kategoriId, desaSlug, dekat],
  )

  const fetchDesa = useCallback(
    (append = false, kursor?: string | null) => {
      startTransition(async () => {
        const res = await daftarDesaDiscovery({
          q: q || undefined,
          dekat,
          radius_m: dekat ? 100000 : undefined,
          batas: 12,
          kursor: append ? (kursor ?? undefined) : undefined,
        })
        setDesa((prev) => (append ? [...prev, ...res.item] : res.item))
        setMetaDs(res.meta)
      })
    },
    [q, dekat],
  )

  const applyFilters = () => {
    if (tab === 'destinasi') fetchDestinasi(false)
    else fetchDesa(false)
  }

  const pakaiLokasi = () => {
    if (!navigator.geolocation) return
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const d = `${pos.coords.latitude},${pos.coords.longitude}`
        setDekat(d)
        setGeoLoading(false)
        startTransition(async () => {
          const [resD, resDs] = await Promise.all([
            cariDestinasiDiscovery({
              q: q || undefined,
              kategori: kategoriId || undefined,
              desa: desaSlug || undefined,
              dekat: d,
              radius_m: 50000,
              batas: 12,
            }),
            daftarDesaDiscovery({ q: q || undefined, dekat: d, radius_m: 100000, batas: 12 }),
          ])
          setDestinasi(resD.item)
          setMetaD(resD.meta)
          setDesa(resDs.item)
          setMetaDs(resDs.meta)
        })
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  const resetGeo = () => {
    setDekat(undefined)
    setDestinasi(initialDestinasi)
    setDesa(initialDesa)
    setMetaD(metaDestinasi)
    setMetaDs(metaDesa)
  }

  const mapMarkers = useMemo(
    () =>
      destinasi
        .filter((d) => d.lokasi)
        .map((d) => ({
          id: d.id,
          nama: d.nama,
          lokasi: d.lokasi!,
          href: `/${d.desa_slug ?? 'teluk-kiluan'}/spot/${d.slug}`,
        })),
    [destinasi],
  )

  return (
    <div className="space-y-8">
      {/* Filter bar */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/60 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex-1">
            <span className="sr-only">Cari</span>
            <span className="relative block">
              <MagnifyingGlassIcon
                className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                placeholder="Cari destinasi atau desa…"
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pr-3 pl-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-primary-500 dark:focus:ring-primary-800"
              />
            </span>
          </label>

          <label className="lg:w-44">
            <span className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Kategori</span>
            <select
              value={kategoriId}
              onChange={(e) => setKategoriId(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            >
              <option value="">Semua</option>
              {kategori.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </label>

          <label className="lg:w-44">
            <span className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Desa</span>
            <select
              value={desaSlug}
              onChange={(e) => setDesaSlug(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            >
              <option value="">Semua desa</option>
              {initialDesa.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.nama}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyFilters}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 dark:bg-primary-600 dark:hover:bg-primary-500"
            >
              <MagnifyingGlassIcon className="size-4" aria-hidden />
              Cari
            </button>
            <button
              type="button"
              onClick={dekat ? resetGeo : pakaiLokasi}
              disabled={geoLoading || pending}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
            >
              {geoLoading ? (
                <ArrowPathIcon className="size-4 animate-spin" aria-hidden />
              ) : (
                <MapPinIcon className="size-4" aria-hidden />
              )}
              {dekat ? 'Reset lokasi' : 'Dekat saya'}
            </button>
          </div>
        </div>
      </div>

      {/* Map + tabs */}
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            <MapIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
            Peta destinasi
          </div>
          <DiscoveryMap markers={mapMarkers} className="sticky top-24 h-[320px] lg:h-[calc(100vh-12rem)]" />
        </div>

        <div className="lg:col-span-3">
          <div className="mb-6 flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800/80">
            {(
              [
                { id: 'destinasi' as Tab, label: 'Destinasi', icon: MapPinIcon },
                { id: 'desa' as Tab, label: 'Desa', icon: BuildingOffice2Icon },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={clsx(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition',
                  tab === id
                    ? 'bg-white text-primary-800 shadow-sm dark:bg-neutral-900 dark:text-primary-100'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200',
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {tab === 'destinasi' ? (
            <>
              {destinasi.length === 0 ? (
                <EmptyState label="Belum ada destinasi publik yang cocok dengan filter." />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {destinasi.map((d) => (
                    <DestinasiCard
                      key={d.id}
                      destinasi={d}
                      kategori={kategoriMap.get(d.kategori_id)}
                      showDesa
                    />
                  ))}
                </div>
              )}
              {metaD.ada_lagi && (
                <LoadMore
                  pending={pending}
                  onClick={() => fetchDestinasi(true, metaD.kursor_berikutnya)}
                />
              )}
            </>
          ) : (
            <>
              {desa.length === 0 ? (
                <EmptyState label="Belum ada desa aktif yang cocok dengan filter." />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {desa.map((d) => (
                    <DesaCard key={d.slug} desa={d} />
                  ))}
                </div>
              )}
              {metaDs.ada_lagi && (
                <LoadMore pending={pending} onClick={() => fetchDesa(true, metaDs.kursor_berikutnya)} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-neutral-300 px-6 py-12 text-center text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
      {label}
    </p>
  )
}

function LoadMore({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return (
    <div className="mt-8 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full border border-primary-300 bg-primary-50 px-6 py-2.5 text-sm font-semibold text-primary-800 hover:bg-primary-100 disabled:opacity-60 dark:border-primary-600 dark:bg-primary-900/40 dark:text-primary-100 dark:hover:bg-primary-900/60"
      >
        {pending && <ArrowPathIcon className="size-4 animate-spin" aria-hidden />}
        Muat lebih banyak
      </button>
    </div>
  )
}

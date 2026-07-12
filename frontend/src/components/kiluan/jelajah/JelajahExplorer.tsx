'use client'

import DesaCard from '@/components/kiluan/DesaCard'
import DestinasiCard from '@/components/kiluan/DestinasiCard'
import SigercivPetaPemilih, { type MarkerPeta } from '@/components/kiluan/peta/SigercivPetaPemilih'
import { cariDestinasiDiscovery, daftarDesaDiscovery } from '@/lib/api/discovery'
import type { DesaRingkas, DestinasiRingkas, Kategori, MetaPaginasi, Tag } from '@/lib/api/types'
import { Link, useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { labelKategori } from '@/lib/i18n/referensi'
import {
  buildJelajahHref,
  PUSAT_LAMPUNG,
  RADIUS_DEKAT_DESA_M,
  RADIUS_DEKAT_DESTINASI_M,
  type JelajahParams,
  type LensaJelajah,
} from '@/lib/kiluan/jelajah-params'
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  MapIcon,
  MapPinIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useMemo, useState, useTransition } from 'react'

interface Props {
  initialDestinasi: DestinasiRingkas[]
  initialDesa: DesaRingkas[]
  metaDestinasi: MetaPaginasi
  metaDesa: MetaPaginasi
  kategori: Kategori[]
  tagsDesa: Tag[]
  params: JelajahParams
  desaNama?: string
}

export default function JelajahExplorer({
  initialDestinasi,
  initialDesa,
  metaDestinasi,
  metaDesa,
  kategori,
  tagsDesa,
  params: initialParams,
  desaNama,
}: Props) {
  const router = useRouter()
  const locale = useLocale() as Locale
  const t = useTranslations('jelajah.explorer')
  const [params, setParams] = useState<JelajahParams>(initialParams)
  const [qInput, setQInput] = useState(initialParams.q ?? '')
  const [destinasi, setDestinasi] = useState(initialDestinasi)
  const [desa, setDesa] = useState(initialDesa)
  const [metaD, setMetaD] = useState(metaDestinasi)
  const [metaDs, setMetaDs] = useState(metaDesa)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const kategoriMap = useMemo(() => new Map(kategori.map((k) => [k.id, k])), [kategori])
  const lensa = params.lensa ?? (params.desa ? 'wisata' : 'desa')
  const scopeDesa = params.desa

  const pushParams = useCallback(
    (next: JelajahParams) => {
      setParams(next)
      router.push(buildJelajahHref(next), { scroll: false })
    },
    [router],
  )

  const fetchAll = useCallback(
    (p: JelajahParams, appendDest = false, appendDesa = false) => {
      startTransition(async () => {
        const dekat = p.dekat
        const [resD, resDs] = await Promise.all([
          cariDestinasiDiscovery({
            q: p.q,
            kategori: p.kategori,
            desa: p.desa,
            tag: p.desa ? p.tag : undefined,
            dekat,
            radius_m: dekat ? RADIUS_DEKAT_DESTINASI_M : undefined,
            batas: 12,
            kursor: appendDest ? metaD.kursor_berikutnya ?? undefined : undefined,
          }),
          daftarDesaDiscovery({
            q: p.q,
            dekat,
            radius_m: dekat ? RADIUS_DEKAT_DESA_M : undefined,
            batas: 12,
            kursor: appendDesa ? metaDs.kursor_berikutnya ?? undefined : undefined,
          }),
        ])
        setDestinasi((prev) => (appendDest ? [...prev, ...resD.item] : resD.item))
        setDesa((prev) => (appendDesa ? [...prev, ...resDs.item] : resDs.item))
        setMetaD(resD.meta)
        setMetaDs(resDs.meta)
      })
    },
    [metaD.kursor_berikutnya, metaDs.kursor_berikutnya],
  )

  const applyFilters = () => {
    const next = { ...params, q: qInput.trim() || undefined }
    pushParams(next)
    fetchAll(next)
  }

  const setLensa = (l: LensaJelajah) => {
    const next = { ...params, lensa: l }
    pushParams(next)
  }

  const setScopeSemua = useCallback(() => {
    const next: JelajahParams = {
      q: params.q,
      kategori: params.kategori,
      dekat: params.dekat,
      lensa: 'desa',
      tag: undefined,
      desa: undefined,
    }
    pushParams(next)
    fetchAll(next)
  }, [params.q, params.kategori, params.dekat, pushParams, fetchAll])

  const pilihDesa = (slug: string) => {
    const next: JelajahParams = {
      ...params,
      desa: slug,
      tag: undefined,
      lensa: 'wisata',
    }
    pushParams(next)
    fetchAll(next)
  }

  const resetFilters = () => {
    setQInput('')
    const next: JelajahParams = { lensa: 'desa' }
    pushParams(next)
    setDestinasi(initialDestinasi)
    setDesa(initialDesa)
    setMetaD(metaDestinasi)
    setMetaDs(metaDesa)
    setGeoError(null)
  }

  const pakaiLokasi = () => {
    if (!navigator.geolocation) {
      setGeoError(t('geoUnsupported'))
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dekat = `${pos.coords.latitude},${pos.coords.longitude}`
        const next = { ...params, dekat }
        setGeoLoading(false)
        pushParams(next)
        fetchAll(next)
      },
      () => {
        setGeoLoading(false)
        setGeoError(t('geoDenied'))
        const next = { ...params, dekat: undefined }
        pushParams(next)
        fetchAll(next)
      },
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  const mapMarkers: MarkerPeta[] = useMemo(() => {
    if (lensa === 'desa' && !scopeDesa) {
      return desa
        .filter((d) => d.lokasi)
        .map((d) => ({
          id: d.slug,
          nama: d.nama,
          lokasi: d.lokasi!,
          tipe: 'desa' as const,
          href: `/${d.slug}`,
          sublabel:
            d.jarak_m != null ? t('distanceKm', { distance: (d.jarak_m / 1000).toFixed(1) }) : undefined,
        }))
    }
    return destinasi
      .filter((d) => d.lokasi)
      .map((d) => {
        const kat = kategoriMap.get(d.kategori_id)
        return {
          id: d.id,
          nama: d.nama,
          lokasi: d.lokasi!,
          tipe: 'destinasi' as const,
          href: `/${d.desa_slug ?? 'teluk-kiluan'}/spot/${d.slug}`,
          sublabel: kat ? labelKategori(kat.kode, locale, kat.nama) : undefined,
        }
      })
  }, [lensa, scopeDesa, desa, destinasi, kategoriMap, locale, t])

  const chips = useMemo(() => {
    const list: { key: string; label: string; clear: () => void }[] = []
    if (params.q) {
      list.push({
        key: 'q',
        label: `"${params.q}"`,
        clear: () => {
          setQInput('')
          pushParams({ ...params, q: undefined })
          fetchAll({ ...params, q: undefined })
        },
      })
    }
    if (params.kategori) {
      const kat = kategoriMap.get(params.kategori)
      list.push({
        key: 'kat',
        label: kat ? labelKategori(kat.kode, locale, kat.nama) : t('categoryFallback'),
        clear: () => {
          pushParams({ ...params, kategori: undefined })
          fetchAll({ ...params, kategori: undefined })
        },
      })
    }
    if (params.desa) {
      list.push({
        key: 'desa',
        label: desaNama ?? params.desa,
        clear: setScopeSemua,
      })
    }
    if (params.tag) {
      list.push({
        key: 'tag',
        label: t('tagPrefix', { tag: params.tag }),
        clear: () => {
          pushParams({ ...params, tag: undefined })
          fetchAll({ ...params, tag: undefined })
        },
      })
    }
    if (params.dekat) {
      list.push({
        key: 'dekat',
        label: t('nearMeChip'),
        clear: () => {
          pushParams({ ...params, dekat: undefined })
          fetchAll({ ...params, dekat: undefined })
        },
      })
    }
    return list
  }, [params, kategoriMap, desaNama, pushParams, fetchAll, setScopeSemua, locale, t])

  const handleMarkerClick = (id: string) => {
    if (lensa === 'desa' && !scopeDesa) {
      pilihDesa(id)
      return
    }
    setHighlightedId(id)
    document.getElementById(`jelajah-item-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
          {t('region')}
        </span>
        <button
          type="button"
          onClick={setScopeSemua}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition',
            !scopeDesa
              ? 'bg-primary-700 text-white shadow-sm dark:bg-primary-600'
              : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200',
          )}
        >
          <GlobeAltIcon className="size-4" aria-hidden />
          {t('allLampung')}
        </button>
        {scopeDesa ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-300 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-800 dark:border-primary-600 dark:bg-primary-900/40 dark:text-primary-100">
            <BuildingOffice2Icon className="size-4" aria-hidden />
            {desaNama ?? scopeDesa}
            <Link
              href={`/${scopeDesa}`}
              className="ms-1 text-xs font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-300"
            >
              {t('openShowcase')}
            </Link>
            <button
              type="button"
              onClick={setScopeSemua}
              className="rounded-full p-0.5 hover:bg-primary-200/60 dark:hover:bg-primary-800"
              aria-label={t('clearDesaFilter')}
            >
              <XMarkIcon className="size-4" />
            </button>
          </span>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <aside className="xl:col-span-3">
          <div className="kiluan-glass-panel sticky top-24 space-y-5 p-5">
            <h2 className="text-sm font-semibold text-primary-800 dark:text-primary-100">{t('filter')}</h2>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('search')}</span>
              <span className="relative block">
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
                <input
                  type="search"
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  placeholder={t('searchPlaceholder')}
                  className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pr-3 pl-9 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-200 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('category')}</span>
              <select
                value={params.kategori ?? ''}
                onChange={(e) => {
                  const kategoriId = e.target.value ? Number(e.target.value) : undefined
                  const next = { ...params, kategori: kategoriId }
                  pushParams(next)
                  fetchAll(next)
                }}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              >
                <option value="">{t('allCategories')}</option>
                {kategori.map((k) => (
                  <option key={k.id} value={k.id}>
                    {labelKategori(k.kode, locale, k.nama)}
                  </option>
                ))}
              </select>
            </label>

            {scopeDesa && tagsDesa.length > 0 ? (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('tag')}</span>
                <select
                  value={params.tag ?? ''}
                  onChange={(e) => {
                    const tag = e.target.value || undefined
                    const next = { ...params, tag }
                    pushParams(next)
                    fetchAll(next)
                  }}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                >
                  <option value="">{t('allTags')}</option>
                  {tagsDesa.map((tag) => (
                    <option key={tag.id} value={tag.kode}>
                      {tag.nama}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={applyFilters}
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 dark:bg-primary-600"
              >
                <MagnifyingGlassIcon className="size-4" aria-hidden />
                {t('apply')}
              </button>
              <button
                type="button"
                onClick={
                  params.dekat
                    ? () => {
                        pushParams({ ...params, dekat: undefined })
                        fetchAll({ ...params, dekat: undefined })
                      }
                    : pakaiLokasi
                }
                disabled={geoLoading || pending}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                {geoLoading ? <ArrowPathIcon className="size-4 animate-spin" aria-hidden /> : <MapPinIcon className="size-4" aria-hidden />}
                {params.dekat ? t('resetLocation') : t('nearMe')}
              </button>
            </div>

            {geoError ? (
              <p className="text-xs text-amber-700 dark:text-amber-300" role="status">
                {geoError}
              </p>
            ) : null}

            {chips.length > 0 ? (
              <div className="border-t border-neutral-200/80 pt-4 dark:border-neutral-700">
                <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('activeFilters')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={c.clear}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-1 text-xs font-medium text-primary-800 hover:bg-primary-200 dark:bg-primary-900/50 dark:text-primary-100"
                    >
                      {c.label}
                      <XMarkIcon className="size-3" aria-hidden />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs font-medium text-neutral-500 underline hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    {t('resetAll')}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="xl:col-span-5">
          <div className="mb-4 flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800/80">
            {(
              [
                { id: 'desa' as LensaJelajah, label: t('lensDesa'), icon: BuildingOffice2Icon, hide: Boolean(scopeDesa) },
                { id: 'wisata' as LensaJelajah, label: t('lensWisata'), icon: MapPinIcon, hide: false },
              ] as const
            )
              .filter((tab) => !tab.hide)
              .map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLensa(id)}
                  aria-pressed={lensa === id}
                  className={clsx(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                    lensa === id
                      ? 'bg-white text-primary-800 shadow-sm dark:bg-neutral-900 dark:text-primary-100'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </button>
              ))}
          </div>

          {pending && (
            <p className="mb-4 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400" role="status">
              <ArrowPathIcon className="size-4 animate-spin" aria-hidden />
              {t('loading')}
            </p>
          )}

          {lensa === 'desa' && !scopeDesa ? (
            <HasilDaftar
              kosong={t('emptyDesa')}
              count={desa.length}
              adaLagi={metaDs.ada_lagi}
              pending={pending}
              onMuat={() => fetchAll(params, false, true)}
            >
              {desa.map((d) => (
                <div
                  key={d.slug}
                  id={`jelajah-item-${d.slug}`}
                  onMouseEnter={() => setHighlightedId(d.slug)}
                  onMouseLeave={() => setHighlightedId(null)}
                  className={clsx(
                    'rounded-2xl transition',
                    highlightedId === d.slug && 'ring-2 ring-kiluan-mint ring-offset-2 dark:ring-offset-neutral-900',
                  )}
                >
                  <DesaCard desa={d} onPilih={() => pilihDesa(d.slug)} />
                </div>
              ))}
            </HasilDaftar>
          ) : (
            <HasilDaftar
              kosong={t('emptyDestinasi')}
              count={destinasi.length}
              adaLagi={metaD.ada_lagi}
              pending={pending}
              onMuat={() => fetchAll(params, true, false)}
            >
              {destinasi.map((d) => (
                <div
                  key={d.id}
                  id={`jelajah-item-${d.id}`}
                  onMouseEnter={() => setHighlightedId(d.id)}
                  onMouseLeave={() => setHighlightedId(null)}
                  className={clsx(
                    'rounded-2xl transition',
                    highlightedId === d.id && 'ring-2 ring-kiluan-mint ring-offset-2 dark:ring-offset-neutral-900',
                  )}
                >
                  <DestinasiCard destinasi={d} kategori={kategoriMap.get(d.kategori_id)} showDesa />
                </div>
              ))}
            </HasilDaftar>
          )}
        </div>

        <div className="xl:col-span-4">
          <div className="sticky top-24 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              <MapIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
              {lensa === 'desa' && !scopeDesa ? t('mapDesa') : t('mapDestinasi')}
            </div>
            <SigercivPetaPemilih
              markers={mapMarkers}
              center={params.dekat ? parseDekat(params.dekat) : PUSAT_LAMPUNG}
              zoom={params.dekat ? 10 : 9}
              highlightedId={highlightedId}
              className="h-[320px] lg:h-[calc(100vh-11rem)]"
              onMarkerClick={handleMarkerClick}
              onMarkerHover={setHighlightedId}
              emptyLabel={t('mapEmpty')}
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('mapHint')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function parseDekat(dekat: string): { lat: number; lng: number } {
  const [lat, lng] = dekat.split(',').map(Number)
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  return PUSAT_LAMPUNG
}

function HasilDaftar({
  children,
  kosong,
  count,
  adaLagi,
  pending,
  onMuat,
}: {
  children: React.ReactNode
  kosong: string
  count: number
  adaLagi: boolean
  pending: boolean
  onMuat: () => void
}) {
  const t = useTranslations('jelajah.explorer')

  if (count === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center text-sm text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
        {kosong}
      </p>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>
      {adaLagi ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onMuat}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full border border-primary-300 bg-primary-50 px-6 py-2.5 text-sm font-semibold text-primary-800 hover:bg-primary-100 disabled:opacity-60 dark:border-primary-600 dark:bg-primary-900/40 dark:text-primary-100"
          >
            {pending && <ArrowPathIcon className="size-4 animate-spin" aria-hidden />}
            {t('loadMore')}
          </button>
        </div>
      ) : null}
    </>
  )
}

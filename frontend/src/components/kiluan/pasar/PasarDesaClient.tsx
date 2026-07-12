'use client'

import ProdukCard from '@/components/kiluan/pasar/ProdukCard'
import UmkmCard from '@/components/kiluan/pasar/UmkmCard'
import { getBidangUsaha } from '@/lib/api/lencana'
import { getDaftarProduk, getDaftarUmkm } from '@/lib/api/pasar'
import type { BidangUsaha, MetaPaginasi, ProdukJasaItem, UmkmRingkas } from '@/lib/api/types'
import { ArrowPathIcon, MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

const META_KOSONG: MetaPaginasi = { kursor_berikutnya: null, ada_lagi: false, batas: 12 }
const RADIUS_DEKAT_M = 30_000

export default function PasarDesaClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('pasar')
  const searchParams = useSearchParams()
  const bidangAwal = searchParams.get('kategori') ?? searchParams.get('bidang')

  const [bidang, setBidang] = useState<number | undefined>(
    bidangAwal ? Number(bidangAwal) || undefined : undefined,
  )
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'produk' | 'umkm'>('produk')
  const [dekat, setDekat] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const [bidangList, setBidangList] = useState<BidangUsaha[]>([])
  const [produk, setProduk] = useState<ProdukJasaItem[]>([])
  const [umkm, setUmkm] = useState<UmkmRingkas[]>([])
  const [metaProduk, setMetaProduk] = useState<MetaPaginasi>(META_KOSONG)
  const [metaUmkm, setMetaUmkm] = useState<MetaPaginasi>(META_KOSONG)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const bidangSudahDimuat = useRef(false)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const tugas: Promise<unknown>[] = [
        getDaftarProduk(desaSlug, { bidang, q: q || undefined, batas: 12 }),
        getDaftarUmkm(desaSlug, {
          bidang,
          q: q || undefined,
          dekat: dekat || undefined,
          radius_m: dekat ? RADIUS_DEKAT_M : undefined,
          batas: 12,
        }),
      ]
      if (!bidangSudahDimuat.current) tugas.push(getBidangUsaha())

      const [p, u, b] = (await Promise.all(tugas)) as [
        { item: ProdukJasaItem[]; meta: MetaPaginasi },
        { item: UmkmRingkas[]; meta: MetaPaginasi },
        BidangUsaha[] | undefined,
      ]
      setProduk(p.item)
      setMetaProduk(p.meta)
      setUmkm(u.item)
      setMetaUmkm(u.meta)
      if (b) {
        setBidangList(b)
        bidangSudahDimuat.current = true
      }
    } finally {
      setLoading(false)
    }
  }, [desaSlug, bidang, q, dekat])

  useEffect(() => {
    const id = setTimeout(() => void muat(), q ? 350 : 0)
    return () => clearTimeout(id)
  }, [muat, q])

  async function muatLagi() {
    setLoadingMore(true)
    try {
      if (tab === 'produk') {
        if (!metaProduk.kursor_berikutnya) return
        const p = await getDaftarProduk(desaSlug, {
          bidang,
          q: q || undefined,
          batas: 12,
          kursor: metaProduk.kursor_berikutnya,
        })
        setProduk((prev) => [...prev, ...p.item])
        setMetaProduk(p.meta)
      } else {
        if (!metaUmkm.kursor_berikutnya) return
        const u = await getDaftarUmkm(desaSlug, {
          bidang,
          q: q || undefined,
          dekat: dekat || undefined,
          radius_m: dekat ? RADIUS_DEKAT_M : undefined,
          batas: 12,
          kursor: metaUmkm.kursor_berikutnya,
        })
        setUmkm((prev) => [...prev, ...u.item])
        setMetaUmkm(u.meta)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  function toggleDekat() {
    if (dekat) {
      setDekat(null)
      setGeoError(null)
      return
    }
    if (!('geolocation' in navigator)) {
      setGeoError(t('geoUnsupported'))
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDekat(`${pos.coords.latitude},${pos.coords.longitude}`)
        setGeoLoading(false)
      },
      () => {
        setGeoError(t('geoDenied'))
        setGeoLoading(false)
      },
      { enableHighAccuracy: false, timeout: 8000 },
    )
  }

  const metaAktif = tab === 'produk' ? metaProduk : metaUmkm

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-kiluan-mint/30 via-primary-50 to-white dark:border-neutral-800 dark:from-primary-950 dark:via-primary-900 dark:to-neutral-950">
        <div className="container py-10 sm:py-12">
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary-800 dark:text-primary-100">
            {t('title')}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
        </div>
      </div>

      <div className="container py-8 sm:py-10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              placeholder={t('searchPlaceholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={t('searchPlaceholder')}
              className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pr-4 pl-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>
          <div className="flex gap-1 rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
            {(['produk', 'umkm'] as const).map((tabKey) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setTab(tabKey)}
                aria-pressed={tab === tabKey}
                className={clsx(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition',
                  tab === tabKey
                    ? 'bg-white text-primary-800 shadow dark:bg-neutral-700 dark:text-primary-100'
                    : 'text-neutral-600 hover:text-primary-700 dark:text-neutral-400 dark:hover:text-primary-300',
                )}
              >
                {t(`tab.${tabKey}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBidang(undefined)}
            className={clsx(
              'rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition',
              bidang === undefined
                ? 'bg-primary-700 text-white ring-primary-700 dark:bg-primary-600 dark:ring-primary-600'
                : 'bg-white text-neutral-700 ring-neutral-300 hover:ring-primary-300 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-700 dark:hover:ring-primary-600',
            )}
          >
            {t('all')}
          </button>
          {bidangList.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBidang(b.id)}
              className={clsx(
                'rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition',
                bidang === b.id
                  ? 'bg-primary-700 text-white ring-primary-700 dark:bg-primary-600 dark:ring-primary-600'
                  : 'bg-white text-neutral-700 ring-neutral-300 hover:ring-primary-300 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-700 dark:hover:ring-primary-600',
              )}
            >
              {b.ikon ? `${b.ikon} ` : ''}
              {b.nama}
            </button>
          ))}

          <span className="mx-1 hidden h-5 w-px bg-neutral-200 sm:block dark:bg-neutral-700" aria-hidden />

          <button
            type="button"
            onClick={toggleDekat}
            aria-pressed={!!dekat}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition',
              dekat
                ? 'bg-kiluan-sea text-white ring-kiluan-sea'
                : 'bg-white text-neutral-700 ring-neutral-300 hover:ring-primary-300 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-700 dark:hover:ring-primary-600',
            )}
          >
            {geoLoading ? (
              <ArrowPathIcon className="size-4 animate-spin" aria-hidden />
            ) : (
              <MapPinIcon className="size-4" aria-hidden />
            )}
            {t('nearMe')}
          </button>
        </div>

        {geoError && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{geoError}</p>}
        {dekat && tab === 'umkm' && (
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{t('sortNearNote')}</p>
        )}

        {loading ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/50"
              />
            ))}
          </div>
        ) : tab === 'produk' ? (
          produk.length === 0 ? (
            <p className="mt-10 text-center text-sm text-neutral-500 dark:text-neutral-400">{t('emptyProduk')}</p>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {produk.map((p) => (
                <ProdukCard key={p.id} produk={p} desaSlug={desaSlug} />
              ))}
            </div>
          )
        ) : umkm.length === 0 ? (
          <p className="mt-10 text-center text-sm text-neutral-500 dark:text-neutral-400">{t('emptyUmkm')}</p>
        ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {umkm.map((u) => (
              <UmkmCard key={u.id} umkm={u} desaSlug={desaSlug} />
            ))}
          </div>
        )}

        {!loading && metaAktif.ada_lagi && metaAktif.kursor_berikutnya && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => void muatLagi()}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-full border border-primary-300 px-6 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 disabled:opacity-50 dark:border-primary-600 dark:text-primary-300 dark:hover:bg-primary-950/40"
            >
              {loadingMore && <ArrowPathIcon className="size-4 animate-spin" aria-hidden />}
              {t('loadMore')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

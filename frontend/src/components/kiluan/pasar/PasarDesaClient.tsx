'use client'

import ProdukCard from '@/components/kiluan/pasar/ProdukCard'
import { SertifikasiBadge } from '@/components/kiluan/pasar/ProdukCard'
import { getBidangUsaha } from '@/lib/api/lencana'
import { getDaftarProduk, getDaftarUmkm } from '@/lib/api/pasar'
import type { BidangUsaha, ProdukJasaItem, UmkmRingkas } from '@/lib/api/types'
import { MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function PasarDesaClient({ desaSlug, desaNama }: Props) {
  const searchParams = useSearchParams()
  const bidangAwal = searchParams.get('kategori') ?? searchParams.get('bidang')
  const [bidang, setBidang] = useState<number | undefined>(
    bidangAwal ? Number(bidangAwal) || undefined : undefined,
  )
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'produk' | 'umkm'>('produk')
  const [bidangList, setBidangList] = useState<BidangUsaha[]>([])
  const [produk, setProduk] = useState<ProdukJasaItem[]>([])
  const [umkm, setUmkm] = useState<UmkmRingkas[]>([])
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const [b, p, u] = await Promise.all([
        getBidangUsaha(),
        getDaftarProduk(desaSlug, { bidang, q: q || undefined }),
        getDaftarUmkm(desaSlug, { bidang, q: q || undefined }),
      ])
      setBidangList(b)
      setProduk(p.item)
      setUmkm(u.item)
    } finally {
      setLoading(false)
    }
  }, [desaSlug, bidang, q])

  useEffect(() => {
    void muat()
  }, [muat])

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-kiluan-mint/30 via-primary-50 to-white dark:from-primary-950 dark:via-primary-900 dark:to-neutral-950">
        <div className="container py-10 sm:py-12">
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary-800 dark:text-primary-100">
            Pasar Desa
          </h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">
            UMKM terverifikasi, produk lokal, dan paket wisata kurasi — urut berdasarkan sertifikasi & kebaruan.
          </p>
        </div>
      </div>

      <div className="container py-8 sm:py-10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              placeholder="Cari produk atau UMKM…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 py-2.5 pr-4 pl-10 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
          </div>
          <div className="flex gap-1 rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
            {(['produk', 'umkm'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={clsx(
                  'rounded-full px-4 py-1.5 text-sm font-medium capitalize transition',
                  tab === t
                    ? 'bg-white text-primary-800 shadow dark:bg-neutral-700 dark:text-primary-100'
                    : 'text-neutral-600 dark:text-neutral-400',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBidang(undefined)}
            className={clsx(
              'rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition',
              bidang === undefined
                ? 'bg-primary-700 text-white ring-primary-700'
                : 'bg-white text-neutral-700 ring-neutral-300 dark:bg-neutral-900 dark:text-neutral-300',
            )}
          >
            Semua
          </button>
          {bidangList.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBidang(b.id)}
              className={clsx(
                'rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition',
                bidang === b.id
                  ? 'bg-primary-700 text-white ring-primary-700'
                  : 'bg-white text-neutral-700 ring-neutral-300 dark:bg-neutral-900 dark:text-neutral-300',
              )}
            >
              {b.ikon} {b.nama}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-10 text-center text-sm text-neutral-500">Memuat katalog…</p>
        ) : tab === 'produk' ? (
          produk.length === 0 ? (
            <p className="mt-10 text-center text-sm text-neutral-500">Belum ada produk publik.</p>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {produk.map((p) => (
                <ProdukCard key={p.id} produk={p} desaSlug={desaSlug} />
              ))}
            </div>
          )
        ) : umkm.length === 0 ? (
          <p className="mt-10 text-center text-sm text-neutral-500">Belum ada UMKM terverifikasi.</p>
        ) : (
          <ul className="mt-8 space-y-3">
            {umkm.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 px-5 py-4 dark:border-neutral-700"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-primary-800 dark:text-primary-100">{u.nama}</h3>
                    <SertifikasiBadge tingkat={u.sertifikasi?.tingkat} />
                  </div>
                  <p className="text-sm text-neutral-500">
                    {u.bidang.ikon} {u.bidang.nama}
                  </p>
                </div>
                {u.jarak_m != null && (
                  <span className="inline-flex items-center gap-1 text-sm text-neutral-500">
                    <MapPinIcon className="size-4" aria-hidden />
                    {u.jarak_m} m
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

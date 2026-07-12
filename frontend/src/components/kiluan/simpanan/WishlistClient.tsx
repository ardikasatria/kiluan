'use client'

import {
  getDaftarSimpanan,
  hapusSimpananAman,
  labelTipeSimpanan,
  ubahCatatanSimpanan,
  urlDetailSimpanan,
  type SimpananItem,
  type SimpananTipe,
} from '@/lib/api/simpanan'
import { pesanGalat } from '@/lib/api/galat'
import { RUTE_DASBOR, RUTE_WISATAWAN } from '@/lib/kiluan/rute-sigerciv'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  HeartIcon,
  MapPinIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop'

type TabWishlist = 'wisata' | 'misi'

interface Props {
  desaSlug?: string
  lintasDesa?: boolean
}

function badgeTipe(tipe: SimpananTipe) {
  const map: Record<SimpananTipe, string> = {
    destinasi: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
    paket: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
    misi: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  }
  return map[tipe]
}

export default function WishlistClient({ desaSlug, lintasDesa = false }: Props) {
  const [tab, setTab] = useState<TabWishlist>('wisata')
  const [destinasi, setDestinasi] = useState<SimpananItem[]>([])
  const [paket, setPaket] = useState<SimpananItem[]>([])
  const [misi, setMisi] = useState<SimpananItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [simpanCatatan, setSimpanCatatan] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [d, p, m] = await Promise.all([
        getDaftarSimpanan({ tipe: 'destinasi', batas: 50 }),
        getDaftarSimpanan({ tipe: 'paket', batas: 50 }),
        getDaftarSimpanan({ tipe: 'misi', batas: 50 }),
      ])
      setDestinasi(d.item)
      setPaket(p.item)
      setMisi(m.item)
    } catch {
      setError('Gagal memuat wishlist. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void muat()
  }, [muat])

  const wisata = [...destinasi, ...paket]

  async function handleHapus(item: SimpananItem) {
    try {
      await hapusSimpananAman(item.desa_slug, item.id)
      if (item.tipe === 'destinasi') setDestinasi((prev) => prev.filter((x) => x.id !== item.id))
      else if (item.tipe === 'paket') setPaket((prev) => prev.filter((x) => x.id !== item.id))
      else setMisi((prev) => prev.filter((x) => x.id !== item.id))
    } catch (err) {
      setError(pesanGalat(err))
    }
  }

  async function handleCatatan(item: SimpananItem, catatan: string) {
    setSimpanCatatan(item.id)
    try {
      const updated = await ubahCatatanSimpanan(item.id, catatan)
      const patch = (prev: SimpananItem[]) =>
        prev.map((x) => (x.id === item.id ? { ...x, catatan: updated.catatan } : x))
      if (item.tipe === 'destinasi') setDestinasi(patch)
      else if (item.tipe === 'paket') setPaket(patch)
      else setMisi(patch)
    } catch (err) {
      setError(pesanGalat(err))
    } finally {
      setSimpanCatatan(null)
    }
  }

  const daftarAktif = tab === 'wisata' ? wisata : misi
  const dasborHref = lintasDesa ? RUTE_DASBOR : `/${desaSlug}/dasbor`
  const discoveryHref = lintasDesa ? RUTE_WISATAWAN.discovery : `/${desaSlug}#destinasi`
  const misiHref = lintasDesa ? RUTE_WISATAWAN.discovery : `/${desaSlug}/misi`

  return (
    <div className="pb-20">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-rose-50 via-white to-primary-50 dark:from-primary-950 dark:via-neutral-950 dark:to-neutral-900">
        <div className="container py-10 sm:py-12">
          <Link
            href={dasborHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-600 dark:text-primary-300"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            Dasbor
          </Link>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-300">
                <HeartIcon className="size-4" aria-hidden />
                Lintas desa Lampung
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary-900 dark:text-primary-50">
                Wishlist saya
              </h1>
              <p className="mt-2 max-w-lg text-sm text-neutral-600 dark:text-neutral-400">
                Destinasi, paket wisata, dan misi regeneratif yang ingin Anda kunjungi atau selesaikan.
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200/80 bg-white/80 px-5 py-3 dark:border-neutral-700 dark:bg-neutral-900/60">
              <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">Total tersimpan</p>
              <p className="mt-0.5 text-2xl font-bold text-primary-800 dark:text-primary-100">
                {destinasi.length + paket.length + misi.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 sm:py-10">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
            <button type="button" onClick={() => void muat()} className="ms-2 font-semibold underline">
              Coba lagi
            </button>
          </div>
        )}

        <div className="mb-8 flex gap-2">
          {(
            [
              ['wisata', `Wisata (${wisata.length})`],
              ['misi', `Misi (${misi.length})`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              aria-pressed={tab === k}
              className={clsx(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                tab === k
                  ? 'bg-primary-700 text-white dark:bg-primary-600'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300',
              )}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void muat()}
            className="ms-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <ArrowPathIcon className="size-4" aria-hidden />
            Segarkan
          </button>
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">Memuat wishlist…</p>
        ) : daftarAktif.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 px-6 py-16 text-center dark:border-neutral-700 dark:bg-neutral-900/40">
            <HeartIcon className="mx-auto size-12 text-neutral-300 dark:text-neutral-600" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              {tab === 'wisata' ? 'Belum ada wisata tersimpan' : 'Belum ada misi tersimpan'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
              Ketuk ikon hati di kartu destinasi, paket, atau misi saat Anda menjelajah Sigerciv.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={discoveryHref}
                className="rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 dark:bg-primary-600"
              >
                Jelajah destinasi
              </Link>
              {tab === 'misi' && (
                <Link
                  href={misiHref}
                  className="rounded-full border border-primary-300 px-5 py-2.5 text-sm font-semibold text-primary-800 hover:bg-primary-50 dark:border-primary-600 dark:text-primary-100 dark:hover:bg-primary-900/40"
                >
                  Lihat misi lestari
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {daftarAktif.map((item) => (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
              >
                <Link href={urlDetailSimpanan(item)} className="group relative block aspect-[16/10] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.entitas.gambar_url || PLACEHOLDER}
                    alt=""
                    className="size-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span
                    className={clsx(
                      'absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                      badgeTipe(item.tipe),
                    )}
                  >
                    {labelTipeSimpanan(item.tipe)}
                  </span>
                </Link>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <p className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400">
                    <MapPinIcon className="size-3.5" aria-hidden />
                    {item.desa_nama}
                  </p>
                  <Link
                    href={urlDetailSimpanan(item)}
                    className="mt-1 text-lg font-semibold text-primary-900 hover:text-primary-600 dark:text-primary-50 dark:hover:text-primary-300"
                  >
                    {item.entitas.nama}
                  </Link>
                  {item.entitas.subjudul ? (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">
                      {item.entitas.subjudul}
                    </p>
                  ) : null}
                  <label className="mt-4 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    Catatan pribadi
                    <textarea
                      defaultValue={item.catatan ?? ''}
                      rows={2}
                      placeholder="Mis. kunjungi saat bulan puasa…"
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-200"
                      onBlur={(e) => {
                        const v = e.target.value.trim()
                        if (v !== (item.catatan ?? '')) void handleCatatan(item, v)
                      }}
                    />
                    {simpanCatatan === item.id ? (
                      <span className="mt-1 block text-[10px] text-neutral-400">Menyimpan…</span>
                    ) : null}
                  </label>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                    <Link
                      href={urlDetailSimpanan(item)}
                      className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                      Buka detail
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleHapus(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <TrashIcon className="size-4" aria-hidden />
                      Hapus
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

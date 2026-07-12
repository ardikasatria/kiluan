'use client'

import SimpanTombol from '@/components/kiluan/simpanan/SimpanTombol'
import TingkatSertifikasi from '@/components/kiluan/pasar/TingkatSertifikasi'
import { Link, useRouter } from '@/i18n/navigation'
import { urlSampulDariMedia } from '@/lib/api/media'
import { getDetailProduk, getDetailUmkm } from '@/lib/api/pasar'
import type { ProdukJasaItem, UmkmDetail } from '@/lib/api/types'
import { tambahKeKeranjang } from '@/lib/kiluan/cart'
import { formatHarga } from '@/lib/kiluan/pasar'
import {
  ArrowLeftIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
  produkId: string
}

export default function ProdukDetailClient({ desaSlug, produkId }: Props) {
  const t = useTranslations('pasar.produkDetail')
  const locale = useLocale()
  const localeTag = locale === 'en' ? 'en-ID' : 'id-ID'
  const router = useRouter()
  const [produk, setProduk] = useState<ProdukJasaItem | null>(null)
  const [umkm, setUmkm] = useState<UmkmDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [aktif, setAktif] = useState(0)
  const [sukses, setSukses] = useState(false)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const p = await getDetailProduk(desaSlug, produkId)
      setProduk(p)
      if (p) {
        const u = await getDetailUmkm(desaSlug, p.umkm.id).catch(() => null)
        setUmkm(u)
      }
    } finally {
      setLoading(false)
    }
  }, [desaSlug, produkId])

  useEffect(() => {
    void muat()
  }, [muat])

  const galeri = useMemo(
    () =>
      [...(produk?.media ?? [])]
        .filter((m) => m.url)
        .sort((a, b) => (a.utama === b.utama ? (a.urutan ?? 0) - (b.urutan ?? 0) : a.utama ? -1 : 1)),
    [produk?.media],
  )

  if (loading) {
    return <p className="container py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
  }
  if (!produk) {
    return <p className="container py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">{t('notFound')}</p>
  }

  const sampul = galeri[aktif]?.url ?? urlSampulDariMedia(produk.media ?? [])

  function keKeranjang(lanjut: boolean) {
    if (!produk) return
    tambahKeKeranjang(desaSlug, {
      item_tipe: 'produk_jasa',
      item_id: produk.id,
      nama: produk.nama,
      harga: produk.harga,
      jumlah: 1,
    })
    setSukses(true)
    if (lanjut) router.push(`/${desaSlug}/checkout`)
  }

  return (
    <div className="pb-20">
      <div className="container py-6">
        <Link
          href={`/${desaSlug}/pasar`}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          {t('back')}
        </Link>
      </div>

      <div className="container grid gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
            {sampul ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sampul} alt={produk.nama} className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-neutral-300 dark:text-neutral-600">
                <PhotoIcon className="size-16" aria-hidden />
              </span>
            )}
          </div>
          {galeri.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {galeri.map((m, i) => (
                <button
                  key={m.lampiran_id ?? m.id}
                  type="button"
                  onClick={() => setAktif(i)}
                  className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                    i === aktif ? 'border-primary-500' : 'border-transparent'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url ?? ''} alt="" className="size-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium capitalize text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            {produk.jenis}
          </span>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-primary-800 sm:text-3xl dark:text-primary-100">
              {produk.nama}
            </h1>
            <SimpanTombol tipe="produk" entitasId={produk.id} desaSlug={desaSlug} />
          </div>
          <p className="mt-4 text-2xl font-bold text-kiluan-sea dark:text-kiluan-mint">
            {formatHarga(produk.harga, produk.satuan_harga, localeTag)}
          </p>
          {produk.jenis === 'produk' && produk.stok != null && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('stock', { count: produk.stok })}</p>
          )}
          {produk.deskripsi && (
            <p className="mt-4 leading-relaxed whitespace-pre-line text-neutral-700 dark:text-neutral-300">
              {produk.deskripsi}
            </p>
          )}

          <Link
            href={`/${desaSlug}/pasar/umkm/${produk.umkm.id}`}
            className="mt-6 flex items-center gap-3 rounded-2xl border border-neutral-200 p-4 transition hover:border-primary-300 dark:border-neutral-700 dark:hover:border-primary-600"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
              <BuildingStorefrontIcon className="size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-neutral-500 dark:text-neutral-400">{t('soldBy')}</span>
              <span className="flex flex-wrap items-center gap-2 font-semibold text-primary-800 dark:text-primary-100">
                {produk.umkm.nama}
                {umkm?.sertifikasi?.tingkat && <TingkatSertifikasi tingkat={umkm.sertifikasi.tingkat} />}
              </span>
            </span>
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">→</span>
          </Link>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => keKeranjang(true)}
              className="flex-1 rounded-full bg-primary-700 py-3 text-sm font-semibold text-white transition hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500"
            >
              {t('addCheckout')}
            </button>
            <button
              type="button"
              onClick={() => keKeranjang(false)}
              className="flex-1 rounded-full border border-primary-300 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-600 dark:text-primary-300 dark:hover:bg-primary-950/40"
            >
              {t('addCart')}
            </button>
          </div>
          {sukses && (
            <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircleIcon className="size-4" aria-hidden />
              {t('added')}
              <Link href={`/${desaSlug}/checkout`} className="underline">
                {t('viewCheckout')}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

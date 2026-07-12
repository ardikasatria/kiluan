'use client'

import ProdukCard from '@/components/kiluan/pasar/ProdukCard'
import TingkatSertifikasi from '@/components/kiluan/pasar/TingkatSertifikasi'
import SigercivPetaPemilih, { type MarkerPeta } from '@/components/kiluan/peta/SigercivPetaPemilih'
import { Link } from '@/i18n/navigation'
import { urlSampulDariMedia } from '@/lib/api/media'
import { getDaftarProduk, getDetailUmkm } from '@/lib/api/pasar'
import type { ProdukJasaItem, UmkmDetail } from '@/lib/api/types'
import {
  ArrowLeftIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
  umkmId: string
}

export default function UmkmDetailClient({ desaSlug, umkmId }: Props) {
  const t = useTranslations('pasar.umkmDetail')
  const [umkm, setUmkm] = useState<UmkmDetail | null>(null)
  const [produk, setProduk] = useState<ProdukJasaItem[]>([])
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const [u, p] = await Promise.all([
        getDetailUmkm(desaSlug, umkmId),
        getDaftarProduk(desaSlug, { umkm_id: umkmId, batas: 24 }),
      ])
      setUmkm(u)
      setProduk(p.item)
    } finally {
      setLoading(false)
    }
  }, [desaSlug, umkmId])

  useEffect(() => {
    void muat()
  }, [muat])

  const galeri = useMemo(
    () =>
      [...(umkm?.media ?? [])]
        .filter((m) => m.url)
        .sort((a, b) => (a.utama === b.utama ? (a.urutan ?? 0) - (b.urutan ?? 0) : a.utama ? -1 : 1)),
    [umkm?.media],
  )
  const sampul = urlSampulDariMedia(umkm?.media ?? [])

  const markers: MarkerPeta[] = useMemo(() => {
    if (!umkm?.lokasi) return []
    return [{ id: umkm.id, nama: umkm.nama, lokasi: umkm.lokasi, tipe: 'destinasi' }]
  }, [umkm])

  if (loading) {
    return <p className="container py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
  }
  if (!umkm) {
    return <p className="container py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">{t('notFound')}</p>
  }

  const waLink = umkm.whatsapp ? `https://wa.me/${umkm.whatsapp.replace(/[^0-9]/g, '')}` : null

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-kiluan-mint/30 via-primary-50 to-white dark:border-neutral-800 dark:from-primary-950 dark:via-primary-900 dark:to-neutral-950">
        <div className="container py-8 sm:py-10">
          <Link
            href={`/${desaSlug}/pasar`}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            {t('back')}
          </Link>
          <div className="mt-5 flex flex-wrap items-start gap-5">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-white/60 shadow-sm dark:bg-neutral-800">
              {sampul ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sampul} alt={umkm.nama} className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-primary-400 dark:text-primary-500">
                  <BuildingStorefrontIcon className="size-10" aria-hidden />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
                {umkm.bidang.ikon ? `${umkm.bidang.ikon} ` : ''}
                {umkm.bidang.nama}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-800 sm:text-3xl dark:text-primary-100">
                {umkm.nama}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <TingkatSertifikasi tingkat={umkm.sertifikasi?.tingkat} skor={umkm.sertifikasi?.skor} size="md" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container grid gap-8 py-8 sm:py-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {umkm.deskripsi && (
            <section>
              <h2 className="text-lg font-semibold text-primary-800 dark:text-primary-100">{t('about')}</h2>
              <p className="mt-2 leading-relaxed whitespace-pre-line text-neutral-700 dark:text-neutral-300">
                {umkm.deskripsi}
              </p>
            </section>
          )}

          {galeri.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-primary-800 dark:text-primary-100">{t('gallery')}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {galeri.map((m) => (
                  <div
                    key={m.lampiran_id ?? m.id}
                    className="aspect-[4/3] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url ?? ''} alt={m.alt ?? umkm.nama} className="size-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold text-primary-800 dark:text-primary-100">{t('products')}</h2>
            {produk.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
                {t('noProducts')}
              </p>
            ) : (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {produk.map((p) => (
                  <ProdukCard key={p.id} produk={p} desaSlug={desaSlug} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
            <h2 className="font-semibold text-primary-800 dark:text-primary-100">{t('contact')}</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {umkm.alamat && (
                <li className="flex gap-2 text-neutral-700 dark:text-neutral-300">
                  <MapPinIcon className="mt-0.5 size-4 shrink-0 text-primary-500" aria-hidden />
                  <span>{umkm.alamat}</span>
                </li>
              )}
              {umkm.telepon && (
                <li className="flex gap-2 text-neutral-700 dark:text-neutral-300">
                  <PhoneIcon className="mt-0.5 size-4 shrink-0 text-primary-500" aria-hidden />
                  <a href={`tel:${umkm.telepon}`} className="hover:underline">
                    {umkm.telepon}
                  </a>
                </li>
              )}
            </ul>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                {t('whatsapp')}
              </a>
            )}
          </div>

          {markers.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
              <div className="h-56">
                <SigercivPetaPemilih markers={markers} center={umkm.lokasi ?? undefined} zoom={14} className="h-full" />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

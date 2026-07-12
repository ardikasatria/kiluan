'use client'

import SimpanTombol from '@/components/kiluan/simpanan/SimpanTombol'
import { Link } from '@/i18n/navigation'
import { urlSampulDariMedia } from '@/lib/api/media'
import { getPaketDetail } from '@/lib/api/pasar'
import type { PaketDetail } from '@/lib/api/types'
import { formatHarga } from '@/lib/kiluan/pasar'
import { kelompokItineraryPerHari, labelItemItinerary } from '@/lib/kiluan/paket'
import {
  ArrowLeftIcon,
  ClockIcon,
  PhotoIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
  paketIdOrSlug: string
}

export default function PaketDetailClient({ desaSlug, paketIdOrSlug }: Props) {
  const t = useTranslations('paket.detail')
  const locale = useLocale()
  const localeTag = locale === 'en' ? 'en-ID' : 'id-ID'
  const [paket, setPaket] = useState<PaketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [aktif, setAktif] = useState(0)
  const [notFound, setNotFound] = useState(false)

  const muat = useCallback(async () => {
    setLoading(true)
    setNotFound(false)
    try {
      const p = await getPaketDetail(desaSlug, paketIdOrSlug)
      if (p.status !== 'publikasi') {
        setNotFound(true)
        setPaket(null)
      } else {
        setPaket(p)
      }
    } catch {
      setNotFound(true)
      setPaket(null)
    } finally {
      setLoading(false)
    }
  }, [desaSlug, paketIdOrSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  const galeri = useMemo(
    () =>
      [...(paket?.media ?? [])]
        .filter((m) => m.url)
        .sort((a, b) => (a.utama === b.utama ? (a.urutan ?? 0) - (b.urutan ?? 0) : a.utama ? -1 : 1)),
    [paket?.media],
  )

  const itinerary = useMemo(() => kelompokItineraryPerHari(paket?.item ?? []), [paket?.item])

  if (loading) {
    return <p className="container py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
  }

  if (notFound || !paket) {
    return (
      <div className="container py-16 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('notFound')}</p>
        <Link href={`/${desaSlug}/paket`} className="mt-4 inline-block text-sm text-primary-600 hover:underline dark:text-primary-400">
          {t('back')}
        </Link>
      </div>
    )
  }

  const sampul = galeri[aktif]?.url ?? urlSampulDariMedia(paket.media ?? [])

  return (
    <div className="pb-20">
      <div className="container py-6">
        <Link
          href={`/${desaSlug}/paket`}
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
              <img src={sampul} alt={paket.nama} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-neutral-400">
                <PhotoIcon className="size-16 opacity-40" aria-hidden />
              </div>
            )}
          </div>
          {galeri.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {galeri.map((m, i) => (
                <button
                  key={m.lampiran_id ?? i}
                  type="button"
                  onClick={() => setAktif(i)}
                  className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === aktif ? 'border-primary-600' : 'border-transparent opacity-70'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url!} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{paket.agen.nama}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-primary-800 dark:text-primary-100">{paket.nama}</h1>
            <SimpanTombol tipe="paket" entitasId={paket.id} desaSlug={desaSlug} onParentClick={false} />
          </div>

          {paket.deskripsi && (
            <p className="mt-4 text-neutral-600 dark:text-neutral-400">{paket.deskripsi}</p>
          )}

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-neutral-600 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="size-4 text-primary-600 dark:text-primary-400" aria-hidden />
              {t('duration', { jam: paket.durasi_jam })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UserGroupIcon className="size-4 text-primary-600 dark:text-primary-400" aria-hidden />
              {t('kuota', { count: paket.kuota_default })}
            </span>
          </div>

          <p className="mt-6 text-2xl font-bold text-kiluan-sea dark:text-kiluan-mint">
            {formatHarga(paket.harga, paket.satuan_harga, localeTag)}
          </p>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{t('priceNote')}</p>

          <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/40">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{t('contactTitle')}</p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t('contactDesc', { agen: paket.agen.nama })}</p>
          </div>
        </div>
      </div>

      {itinerary.length > 0 && (
        <div className="container mt-12">
          <section className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">{t('itinerary')}</h2>
            <div className="mt-6 space-y-8">
              {itinerary.map(({ hari, item }) => (
                <div key={hari}>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                    {t('hari', { hari })}
                  </h3>
                  <ol className="mt-4 space-y-4 border-s-2 border-primary-200 ps-4 dark:border-primary-800">
                    {item.map((it) => (
                      <li key={it.id} className="relative">
                        <span className="absolute -start-[1.35rem] top-1.5 size-2.5 rounded-full bg-primary-600 dark:bg-primary-400" aria-hidden />
                        <p className="font-medium text-neutral-800 dark:text-neutral-100">{labelItemItinerary(it)}</p>
                        {it.deskripsi && (
                          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{it.deskripsi}</p>
                        )}
                        {it.durasi_menit > 0 && (
                          <p className="mt-1 text-xs text-neutral-400">{t('minutes', { count: it.durasi_menit })}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

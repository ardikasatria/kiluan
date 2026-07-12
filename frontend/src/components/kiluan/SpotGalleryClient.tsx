'use client'

import type { MediaItem } from '@/lib/api/types'
import { ChevronLeftIcon, ChevronRightIcon, PhotoIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import useEmblaCarousel from 'embla-carousel-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop'

interface Props {
  nama: string
  media: MediaItem[]
  kategori?: string | null
}

export default function SpotGalleryClient({ nama, media, kategori }: Props) {
  const t = useTranslations('spot.gallery')
  const slides = useMemo(
    () =>
      media
        .filter((m) => m.url)
        .sort((a, b) => {
          if (a.utama && !b.utama) return -1
          if (!a.utama && b.utama) return 1
          return (a.urutan ?? 0) - (b.urutan ?? 0)
        }),
    [media],
  )
  const punyaGaleri = slides.length > 0
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: slides.length > 1 })
  const [indeks, setIndeks] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setIndeks(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  const scrollPrev = () => emblaApi?.scrollPrev()
  const scrollNext = () => emblaApi?.scrollNext()

  if (!punyaGaleri) {
    return (
      <div className="relative aspect-[21/9] min-h-[200px] w-full overflow-hidden rounded-none bg-neutral-100 sm:min-h-[280px] lg:min-h-[360px] lg:rounded-2xl dark:bg-neutral-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PLACEHOLDER} alt={nama} className="size-full object-cover opacity-80 dark:opacity-60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-primary-950/70 via-primary-900/30 to-transparent text-white">
          <PhotoIcon className="size-10 opacity-90" aria-hidden />
          <p className="text-sm font-medium">{t('empty')}</p>
        </div>
        <OverlayJudul nama={nama} kategori={kategori} />
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <div className="relative overflow-hidden rounded-none bg-neutral-900 lg:rounded-2xl">
        <div ref={emblaRef} aria-roledescription="carousel" aria-label={t('carouselLabel', { nama })}>
          <div className="flex">
            {slides.map((m, i) => (
              <div
                key={m.id}
                className="relative min-h-[200px] min-w-0 flex-[0_0_100%] sm:min-h-[280px] lg:min-h-[360px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url!}
                  alt={m.alt ?? t('photoAlt', { nama, n: i + 1 })}
                  className="size-full object-cover"
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>
        </div>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={scrollPrev}
              className="absolute top-1/2 left-2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none sm:left-4 sm:size-11"
              aria-label={t('prev')}
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              className="absolute top-1/2 right-2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none sm:right-4 sm:size-11"
              aria-label={t('next')}
            >
              <ChevronRightIcon className="size-5" />
            </button>
            <p className="sr-only" aria-live="polite">
              {t('counter', { current: indeks + 1, total: slides.length })}
            </p>
            <div className="absolute bottom-20 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 sm:bottom-24 lg:bottom-28">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={clsx(
                    'size-2 rounded-full transition',
                    i === indeks ? 'bg-white shadow-sm' : 'bg-white/45',
                  )}
                  aria-hidden
                />
              ))}
            </div>
          </>
        )}

        <OverlayJudul nama={nama} kategori={kategori} />
      </div>

      {slides.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:px-6 lg:container lg:mt-4 lg:px-0">
          {slides.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => emblaApi?.scrollTo(i)}
              className={clsx(
                'relative size-14 shrink-0 overflow-hidden rounded-lg border-2 transition sm:size-16',
                i === indeks
                  ? 'border-primary-500 opacity-100 ring-2 ring-primary-500/30 dark:border-primary-400'
                  : 'border-transparent opacity-65 hover:opacity-90 dark:opacity-55 dark:hover:opacity-80',
              )}
              aria-label={t('viewPhoto', { n: i + 1 })}
              aria-current={i === indeks ? 'true' : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url!} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function OverlayJudul({ nama, kategori }: { nama: string; kategori?: string | null }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 px-4 pb-6 sm:px-6 lg:container lg:pb-8">
        {kategori && (
          <span className="mb-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {kategori}
          </span>
        )}
        <h1 className="text-2xl font-bold text-white drop-shadow-sm sm:text-3xl lg:text-4xl">{nama}</h1>
      </div>
    </>
  )
}

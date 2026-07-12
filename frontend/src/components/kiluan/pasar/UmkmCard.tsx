'use client'

import TingkatSertifikasi from '@/components/kiluan/pasar/TingkatSertifikasi'
import { Link } from '@/i18n/navigation'
import { urlSampulDariMedia } from '@/lib/api/media'
import type { UmkmRingkas } from '@/lib/api/types'
import { BuildingStorefrontIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'

interface Props {
  umkm: UmkmRingkas
  desaSlug: string
}

export default function UmkmCard({ umkm, desaSlug }: Props) {
  const t = useTranslations('pasar')
  const sampul = urlSampulDariMedia(umkm.media ?? [])
  const href = `/${desaSlug}/pasar/umkm/${umkm.id}`

  return (
    <Link
      href={href}
      className="group flex gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-primary-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none sm:p-5 dark:border-neutral-700 dark:bg-neutral-900/50 dark:hover:border-primary-600"
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:size-20 dark:bg-neutral-800">
        {sampul ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sampul} alt={umkm.nama} className="size-full object-cover" loading="lazy" />
        ) : (
          <span className="flex size-full items-center justify-center text-primary-400 dark:text-primary-500">
            <BuildingStorefrontIcon className="size-8" aria-hidden />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-primary-800 group-hover:text-primary-700 dark:text-primary-100">
            {umkm.nama}
          </h3>
          <TingkatSertifikasi tingkat={umkm.sertifikasi?.tingkat} />
        </div>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {umkm.bidang.ikon ? `${umkm.bidang.ikon} ` : ''}
          {umkm.bidang.nama}
        </p>
        {umkm.jarak_m != null && (
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400">
            <MapPinIcon className="size-3.5" aria-hidden />
            {t('distanceM', { distance: umkm.jarak_m })}
          </p>
        )}
      </div>

      <span className="hidden self-center text-sm font-semibold text-primary-600 group-hover:text-primary-500 sm:inline dark:text-primary-400">
        {t('card.viewUmkm')} →
      </span>
    </Link>
  )
}

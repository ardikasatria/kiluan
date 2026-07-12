import SimpanTombol from '@/components/kiluan/simpanan/SimpanTombol'
import type { DestinasiRingkas, Kategori } from '@/lib/api/types'
import { MapPinIcon, PhotoIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop'

interface Props {
  destinasi: DestinasiRingkas
  desaSlug?: string
  kategori?: Kategori | null
  showDesa?: boolean
  /** URL foto sampul jika tersedia dari API detail/media */
  sampulUrl?: string | null
}

export default function DestinasiCard({
  destinasi,
  desaSlug,
  kategori,
  showDesa,
  sampulUrl,
}: Props) {
  const slug = desaSlug ?? destinasi.desa_slug ?? 'teluk-kiluan'
  const href = `/${slug}/spot/${destinasi.slug}`
  const gambar = sampulUrl || PLACEHOLDER
  const punyaFotoAsli = Boolean(sampulUrl)

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:border-primary-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:border-primary-600"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        {punyaFotoAsli ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gambar}
            alt={destinasi.nama}
            className="size-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <Image
            src={PLACEHOLDER}
            alt={destinasi.nama}
            fill
            className="object-cover opacity-90 transition duration-300 group-hover:scale-105 dark:opacity-75"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
        {kategori && (
          <span className="absolute top-3 left-3 rounded-full bg-primary-800/90 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm dark:bg-primary-900/90">
            {kategori.nama}
          </span>
        )}
        <SimpanTombol
          tipe="destinasi"
          entitasId={destinasi.id}
          desaSlug={slug}
          size="sm"
          className="absolute top-3 right-3 z-10"
        />
        <div
          className={clsx(
            'absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-lg text-white backdrop-blur-sm',
            punyaFotoAsli ? 'bg-black/25' : 'bg-black/35',
          )}
        >
          <PhotoIcon className="size-4" aria-hidden />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {showDesa && destinasi.desa_slug && (
          <p className="text-xs font-medium tracking-wide text-primary-600 uppercase dark:text-primary-400">
            {destinasi.desa_slug}
          </p>
        )}
        <h3 className="text-lg font-semibold text-primary-800 group-hover:text-primary-600 dark:text-primary-100 dark:group-hover:text-primary-300">
          {destinasi.nama}
        </h3>
        {destinasi.alamat && (
          <p className="mt-1 flex items-start gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="line-clamp-2">{destinasi.alamat}</span>
          </p>
        )}
        {destinasi.jarak_m != null && (
          <p className="mt-2 text-xs font-medium text-primary-600 dark:text-primary-400">
            ± {destinasi.jarak_m} m dari Anda
          </p>
        )}
      </div>
    </Link>
  )
}

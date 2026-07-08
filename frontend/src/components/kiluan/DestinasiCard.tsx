import type { DestinasiRingkas } from '@/lib/api/types'
import { MapPinIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop'

interface Props {
  desaSlug: string
  destinasi: DestinasiRingkas
}

export default function DestinasiCard({ desaSlug, destinasi }: Props) {
  return (
    <Link
      href={`/${desaSlug}/spot/${destinasi.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:border-primary-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:border-primary-600"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        <Image
          src={PLACEHOLDER}
          alt={destinasi.nama}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="text-lg font-semibold text-primary-800 group-hover:text-primary-600 dark:text-primary-100 dark:group-hover:text-primary-300">
          {destinasi.nama}
        </h3>
        {destinasi.alamat && (
          <p className="mt-1 flex items-start gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            <MapPinIcon className="mt-0.5 size-4 shrink-0" />
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

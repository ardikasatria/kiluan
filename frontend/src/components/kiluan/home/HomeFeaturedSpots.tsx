import DestinasiCard from '@/components/kiluan/DestinasiCard'
import type { DestinasiRingkas, Kategori } from '@/lib/api/types'
import { ArrowRightIcon, StarIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface Props {
  destinasi: DestinasiRingkas[]
  kategori: Kategori[]
}

export default function HomeFeaturedSpots({ destinasi, kategori }: Props) {
  if (destinasi.length === 0) return null

  const kategoriMap = new Map(kategori.map((k) => [k.id, k]))
  const items = destinasi.slice(0, 6)

  return (
    <section id="spot-unggulan" className="scroll-mt-24 py-16 sm:py-20">
      <div className="container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
              <StarIcon className="size-4" aria-hidden />
              Etalase publik
            </p>
            <h2 className="mt-1 text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">
              Spot unggulan
            </h2>
            <p className="mt-2 max-w-xl text-neutral-600 dark:text-neutral-400">
              Destinasi aktif dari desa mitra — dikurasi komunitas, siap dijelajahi.
            </p>
          </div>
          <Link
            href="/#discovery"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-600 dark:text-primary-300"
          >
            Lihat semua
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d) => (
            <DestinasiCard
              key={d.id}
              destinasi={d}
              kategori={d.kategori_id ? kategoriMap.get(d.kategori_id) : null}
              showDesa
            />
          ))}
        </div>
      </div>
    </section>
  )
}

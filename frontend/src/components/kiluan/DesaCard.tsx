import type { DesaRingkas } from '@/lib/api/types'
import { BuildingOffice2Icon, MapPinIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface Props {
  desa: DesaRingkas
}

export default function DesaCard({ desa }: Props) {
  return (
    <Link
      href={`/${desa.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:border-primary-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:border-primary-600"
    >
      <div className="flex items-center gap-3 bg-gradient-to-br from-primary-700 to-primary-600 px-5 py-6 text-white dark:from-primary-800 dark:to-primary-700">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
          <BuildingOffice2Icon className="size-6" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{desa.nama}</h3>
          <p className="text-sm text-primary-100/90">/{desa.slug}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {desa.deskripsi && (
          <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{desa.deskripsi}</p>
        )}
        {desa.jarak_m != null && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400">
            <MapPinIcon className="size-3.5" aria-hidden />
            ± {desa.jarak_m} m dari Anda
          </p>
        )}
        <span className="mt-4 text-sm font-semibold text-primary-700 group-hover:text-primary-600 dark:text-primary-300">
          Jelajahi etalase →
        </span>
      </div>
    </Link>
  )
}

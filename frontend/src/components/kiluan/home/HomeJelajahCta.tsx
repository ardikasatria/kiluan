import { ArrowRightIcon, GlobeAltIcon, MapIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function HomeJelajahCta() {
  return (
    <section className="border-t border-neutral-200/70 py-16 dark:border-neutral-800/70 sm:py-20">
      <div className="container">
        <div className="kiluan-glass-panel overflow-hidden">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="p-8 sm:p-10 lg:p-12">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
                <GlobeAltIcon className="size-4" aria-hidden />
                Lintas desa · Lampung
              </p>
              <h2 className="mt-2 text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">
                Jelajah desa wisata di seluruh Lampung
              </h2>
              <p className="mt-3 max-w-lg text-neutral-600 dark:text-neutral-400">
                Peta interaktif, filter kategori, pencarian, dan jarak dari lokasi Anda — temukan destinasi
                regeneratif dari desa ke desa.
              </p>
              <Link
                href="/jelajah"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-kiluan-mint focus-visible:outline-none dark:bg-primary-600"
              >
                Buka halaman Jelajah
                <ArrowRightIcon className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="relative hidden min-h-[220px] bg-gradient-to-br from-primary-700/90 via-kiluan-teal/80 to-kiluan-sea/70 lg:block">
              <div className="absolute inset-0 flex items-center justify-center">
                <MapIcon className="size-24 text-white/20" aria-hidden />
              </div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(170,255,199,.25),transparent_55%)]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

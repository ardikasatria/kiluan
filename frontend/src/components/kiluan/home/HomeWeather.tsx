import WeatherWidget from '@/components/kiluan/WeatherWidget'
import type { CuacaResponse } from '@/lib/api/types'
import { CloudIcon } from '@heroicons/react/24/outline'

interface Props {
  cuaca: CuacaResponse | null
}

export default function HomeWeather({ cuaca }: Props) {
  if (!cuaca) return null

  return (
    <section className="py-16 sm:py-20">
      <div className="container">
        <div className="mb-8 max-w-2xl">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
            <CloudIcon className="size-4" aria-hidden />
            Cuaca & keselamatan
          </p>
          <h2 className="mt-1 text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">
            Kondisi bahari & darat
          </h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Periksa prakiraan sebelum berlayar. Kartu hilang otomatis bila layanan cuaca tidak tersedia.
          </p>
        </div>
        <div className="max-w-2xl">
          <WeatherWidget cuaca={cuaca} />
        </div>
      </div>
    </section>
  )
}

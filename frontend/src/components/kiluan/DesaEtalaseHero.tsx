import WeatherWidget from '@/components/kiluan/WeatherWidget'
import type { CuacaResponse, ProfilDesa } from '@/lib/api/types'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Cog6ToothIcon,
  MapPinIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=2000&auto=format&fit=crop'

interface Props {
  profil: ProfilDesa
  desaSlug: string
  cuaca: CuacaResponse | null
  jumlahDestinasi?: number
}

export default function DesaEtalaseHero({ profil, desaSlug, cuaca, jumlahDestinasi = 0 }: Props) {
  const lokasi = [profil.pekon, profil.kecamatan, profil.kabupaten, profil.provinsi].filter(Boolean).join(', ')

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={DEFAULT_COVER}
          alt={profil.nama}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-950/92 via-primary-900/80 to-primary-800/50 dark:from-neutral-950/95 dark:via-primary-950/88 dark:to-primary-900/65" />
      </div>

      <div className="container relative py-8 sm:py-12 lg:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-100/90 hover:text-white"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Kembali ke Kiluan
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-primary-100 backdrop-blur-sm">
              <SparklesIcon className="size-4" aria-hidden />
              Etalase Desa Wisata Regeneratif
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              {profil.nama}
            </h1>
            {profil.deskripsi && (
              <p className="mt-4 text-base leading-relaxed text-primary-50/90 sm:text-lg">{profil.deskripsi}</p>
            )}
            {lokasi && (
              <p className="mt-4 flex items-start gap-2 text-sm text-primary-100">
                <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                {lokasi}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#destinasi"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary-800 shadow-lg hover:bg-primary-50"
              >
                Jelajahi destinasi
                <ArrowRightIcon className="size-4" aria-hidden />
              </a>
              <Link
                href={`/${desaSlug}/dasbor`}
                className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/15"
              >
                Dasbor saya
              </Link>
              <Link
                href={`/${desaSlug}/kelola`}
                className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/15"
              >
                <Cog6ToothIcon className="size-4" aria-hidden />
                Kelola desa
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <StatPill label="Spot publik" value={String(jumlahDestinasi)} />
              <StatPill label="Tenant" value={profil.slug} />
            </div>
          </div>

          <div className="lg:pl-4">
            {cuaca && <WeatherWidget cuaca={cuaca} />}
          </div>
        </div>
      </div>
    </section>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
      <p className="text-[10px] font-medium tracking-wide text-primary-100/75 uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

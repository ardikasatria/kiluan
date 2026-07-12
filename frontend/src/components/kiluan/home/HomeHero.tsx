import {
  ArrowRightIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'
import HomeHeroSearch from './HomeHeroSearch'

const HERO_IMAGE = {
  src: '/gallery/laguna.jpg',
  alt: 'Laguna Teluk Kiluan — perairan tenang untuk snorkeling',
} as const

export default function HomeHero() {
  return (
    <section className="relative -mt-[72px] overflow-hidden pt-[72px] lg:-mt-20 lg:pt-20">
      <div className="absolute inset-0">
        <Image
          src={HERO_IMAGE.src}
          alt={HERO_IMAGE.alt}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-950/92 via-primary-900/78 to-primary-800/55 dark:from-neutral-950/95 dark:via-primary-950/88 dark:to-primary-900/70" />
      </div>

      <div className="container relative py-16 sm:py-20 lg:py-28">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-primary-100 backdrop-blur-sm">
            <SparklesIcon className="size-4" aria-hidden />
            Platform Desa Wisata Regeneratif
          </p>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl lg:leading-tight">
            Berwisata yang meninggalkan Kiluan lebih baik
          </h1>
          <p className="mt-5 text-base leading-relaxed text-primary-50/90 sm:text-lg">
            sigerciv menatalayan teknologi agar data destinasi dimiliki komunitas, nilai ekonomi mengalir ke
            warga lokal, dan dana konservasi dapat diawasi secara transparan.
          </p>

          <HomeHeroSearch />

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/teluk-kiluan"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary-800 shadow-lg transition hover:bg-primary-50 focus-visible:ring-2 focus-visible:ring-kiluan-mint focus-visible:outline-none"
            >
              Jelajah
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
            <Link
              href="/daftar"
              className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-kiluan-mint focus-visible:outline-none"
            >
              <UserPlusIcon className="size-4" aria-hidden />
              Gabung
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-4 text-sm text-primary-100/85">
            <span className="inline-flex items-center gap-2">
              <DevicePhoneMobileIcon className="size-4 shrink-0" aria-hidden />
              PWA offline-first
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

import {
  ArrowRightIcon,
  DevicePhoneMobileIcon,
  GlobeAsiaAustraliaIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'

const HERO_IMAGE = {
  src: '/gallery/laguna.jpg',
  alt: 'Laguna Teluk Kiluan',
} as const

export default function HomeHero() {
  return (
    <section className="relative overflow-hidden">
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
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-primary-100 backdrop-blur-sm">
              <SparklesIcon className="size-4" aria-hidden />
              Platform Desa Wisata Regeneratif
            </p>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl lg:leading-tight">
              sigerciv — wisata milik komunitas, bukan marketplace ekstraktif
            </h1>
            <p className="mt-5 text-base leading-relaxed text-primary-50/90 sm:text-lg">
              Data destinasi, layanan, dan cerita lokal dimiliki desa &amp; Pokdarwis. sigerciv menatalayan
              teknologi agar nilai ekonomi mengalir ke penyedia lokal dan loop regeneratif tetap terukur.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/teluk-kiluan"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary-800 shadow-lg transition hover:bg-primary-50"
              >
                Jelajahi Teluk Kiluan
                <ArrowRightIcon className="size-4" aria-hidden />
              </Link>
              <Link
                href="#discovery"
                className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
              >
                Cari destinasi
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-4 text-sm text-primary-100/85">
              <span className="inline-flex items-center gap-2">
                <GlobeAsiaAustraliaIcon className="size-4 shrink-0" aria-hidden />
                Multi-desa · tenant per Pokdarwis
              </span>
              <span className="inline-flex items-center gap-2">
                <DevicePhoneMobileIcon className="size-4 shrink-0" aria-hidden />
                PWA offline-first
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
            <StatCard label="Instans flagship" value="Teluk Kiluan" sub="Kelumbayan, Tanggamus, Lampung" />
            <StatCard label="Modul Fase 0" value="Gerbang" sub="Etalase & discovery publik" accent />
            <StatCard label="Kepemilikan data" value="Komunitas" sub="Bukan agregator OTA pusat" />
            <StatCard label="KPI regeneratif" value="Neraca Lestari" sub="Daya dukung & dana konservasi" accent />
          </div>
        </div>
      </div>
    </section>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-5 backdrop-blur-md ${
        accent
          ? 'border-kiluan-mint/30 bg-kiluan-mint/10'
          : 'border-white/15 bg-white/10'
      }`}
    >
      <p className="text-xs font-medium tracking-wide text-primary-100/80 uppercase">{label}</p>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-primary-100/75">{sub}</p>
    </div>
  )
}

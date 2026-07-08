import Link from 'next/link'
import {
  BanknotesIcon,
  CalendarDaysIcon,
  MapIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

interface Props {
  desaSlug: string
}

const links = [
  {
    icon: MapIcon,
    title: 'Panduan berkunjung',
    desc: 'Etika bahari, cuaca, dan tips PWA offline.',
    href: (slug: string) => `/${slug}/panduan`,
    ready: true,
  },
  {
    icon: SparklesIcon,
    title: 'Profil desa',
    desc: 'Cerita komunitas & visi regeneratif.',
    href: (slug: string) => `/${slug}/tentang`,
    ready: true,
  },
  {
    icon: BanknotesIcon,
    title: 'Pasar Desa',
    desc: 'UMKM & layanan lokal (Fase 1).',
    href: (slug: string) => `/${slug}/pasar`,
    ready: true,
  },
  {
    icon: CalendarDaysIcon,
    title: 'Kalender aktivitas',
    desc: 'Jadwal lumba-lumba & event musiman.',
    href: (slug: string) => `/${slug}/kalender`,
    ready: true,
  },
]

export default function DesaQuickLinks({ desaSlug }: Props) {
  return (
    <section className="border-b border-neutral-200 bg-neutral-50 py-12 dark:border-neutral-800 dark:bg-neutral-900/50 sm:py-14">
      <div className="container">
        <h2 className="text-lg font-semibold text-primary-800 dark:text-primary-100">Jelajahi lebih lanjut</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {links.map(({ icon: Icon, title, desc, href, ready }) => {
            const className =
              'group flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-5 transition dark:border-neutral-700 dark:bg-neutral-800/60' +
              (ready
                ? ' hover:border-primary-300 hover:shadow-sm dark:hover:border-primary-600'
                : ' opacity-75')

            const inner = (
              <>
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="mt-3 font-semibold text-primary-800 dark:text-primary-100">{title}</h3>
                <p className="mt-1 flex-1 text-sm text-neutral-600 dark:text-neutral-400">{desc}</p>
                {!ready && (
                  <span className="mt-3 inline-block text-xs font-medium text-primary-600 dark:text-primary-400">
                    Segera hadir
                  </span>
                )}
                {ready && (
                  <span className="mt-3 text-sm font-semibold text-primary-700 group-hover:text-primary-600 dark:text-primary-300">
                    Buka →
                  </span>
                )}
              </>
            )

            return (
              <li key={title}>
                {ready ? (
                  <Link href={href(desaSlug)} className={className}>
                    {inner}
                  </Link>
                ) : (
                  <div className={className}>{inner}</div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

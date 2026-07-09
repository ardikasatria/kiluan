import {
  GlobeAltIcon,
  MapIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

const modules = [
  {
    icon: GlobeAltIcon,
    name: 'Gerbang',
    tag: 'Etalase & Discovery',
    fase: 'F0',
    desc: 'Katalog destinasi lintas desa, peta interaktif, filter kategori, dan halaman spot publik.',
    href: '#discovery',
  },
  {
    icon: UserCircleIcon,
    name: 'Balai Warga',
    tag: 'Identitas & Keanggotaan',
    fase: 'F0',
    desc: 'Auth multi-peran, RBAC per tenant, masuk & daftar untuk wisatawan hingga pengelola Pokdarwis.',
    href: '/masuk',
  },
  {
    icon: MapIcon,
    name: 'Destinasi sigerciv',
    tag: 'Basis Data Wisata',
    fase: 'F0',
    desc: 'Spot terstruktur dengan geo PostGIS, layanan, kalender aktivitas, dan galeri media MinIO.',
    href: '/teluk-kiluan/kelola/destinasi',
  },
]

export default function HomeModules() {
  return (
    <section className="border-y border-neutral-200 bg-white py-16 dark:border-neutral-800 dark:bg-neutral-900/30 sm:py-20">
      <div className="container">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">
            Modul Fase 0 — fondasi platform hidup
          </h2>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">
            Tiga ruang inti yang sudah aktif: etalase publik, keanggotaan multi-peran, dan data destinasi
            terstruktur.
          </p>
        </div>

        <ul className="mt-10 grid gap-6 lg:grid-cols-3">
          {modules.map(({ icon: Icon, name, tag, fase, desc, href }) => (
            <li key={name}>
              <Link
                href={href}
                className="group flex h-full flex-col rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 transition hover:border-primary-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/40 dark:hover:border-primary-600"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                    <Icon className="size-6" aria-hidden />
                  </div>
                  <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-800 dark:bg-primary-900/60 dark:text-primary-200">
                    {fase}
                  </span>
                </div>
                <p className="mt-4 text-xs font-medium tracking-wide text-primary-600 uppercase dark:text-primary-400">
                  {tag}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-primary-800 group-hover:text-primary-600 dark:text-primary-100">
                  {name}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{desc}</p>
                <span className="mt-4 text-sm font-semibold text-primary-700 dark:text-primary-300">
                  Pelajari →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

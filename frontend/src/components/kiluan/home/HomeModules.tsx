import { Link } from '@/i18n/navigation'
import {
  GlobeAltIcon,
  MapIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { getTranslations } from 'next-intl/server'

const MODULE_KEYS = ['gerbang', 'balai', 'destinasi'] as const
const MODULE_ICONS = {
  gerbang: GlobeAltIcon,
  balai: UserCircleIcon,
  destinasi: MapIcon,
} as const
const MODULE_HREFS = {
  gerbang: '/jelajah',
  balai: '/masuk',
  destinasi: '/teluk-kiluan/kelola/destinasi',
} as const

export default async function HomeModules() {
  const t = await getTranslations('landing.modules')

  return (
    <section className="border-y border-neutral-200/70 bg-white/35 py-16 backdrop-blur-sm dark:border-neutral-800/70 dark:bg-neutral-900/25 sm:py-20">
      <div className="container">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">{t('title')}</h2>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
        </div>

        <ul className="mt-10 grid gap-6 lg:grid-cols-3">
          {MODULE_KEYS.map((key) => {
            const Icon = MODULE_ICONS[key]
            const href = MODULE_HREFS[key]
            return (
              <li key={key}>
                <Link
                  href={href}
                  className="group flex h-full flex-col rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 transition hover:border-primary-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/40 dark:hover:border-primary-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                      <Icon className="size-6" aria-hidden />
                    </div>
                    <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-800 dark:bg-primary-900/60 dark:text-primary-200">
                      F0
                    </span>
                  </div>
                  <p className="mt-4 text-xs font-medium tracking-wide text-primary-600 uppercase dark:text-primary-400">
                    {t(`items.${key}.tag`)}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-primary-800 group-hover:text-primary-600 dark:text-primary-100">
                    {t(`items.${key}.name`)}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {t(`items.${key}.desc`)}
                  </p>
                  <span className="mt-4 text-sm font-semibold text-primary-700 dark:text-primary-300">
                    {t('learnMore')}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

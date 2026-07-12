import {
  ArrowRightIcon,
  BookOpenIcon,
  ClipboardDocumentCheckIcon,
  MapIcon,
} from '@heroicons/react/24/outline'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'

const STEP_KEYS = ['learn', 'act', 'stamp'] as const
const STEP_ICONS = [BookOpenIcon, ClipboardDocumentCheckIcon, MapIcon] as const

export default async function HomeMisiLestari() {
  const t = await getTranslations('landing.misiLestari')

  return (
    <section className="border-y border-neutral-200/70 bg-white/35 py-16 backdrop-blur-sm dark:border-neutral-800/70 dark:bg-neutral-900/25 sm:py-20">
      <div className="container">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{t('eyebrow')}</p>
            <h2 className="mt-1 text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">{t('title')}</h2>
            <p className="mt-3 text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/jelajah"
                className="inline-flex items-center gap-2 rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-500"
              >
                {t('exploreVillages')}
                <ArrowRightIcon className="size-4" aria-hidden />
              </Link>
              <Link
                href="/paspor"
                className="inline-flex items-center gap-2 rounded-full border border-primary-300 px-5 py-2.5 text-sm font-semibold text-primary-800 hover:bg-primary-50 dark:border-primary-600 dark:text-primary-100 dark:hover:bg-primary-900/40"
              >
                {t('viewPaspor')}
              </Link>
            </div>
          </div>

          <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {STEP_KEYS.map((key, i) => {
              const Icon = STEP_ICONS[i]!
              return (
                <li
                  key={key}
                  className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/60"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-kiluan-mint/25 text-primary-700 dark:bg-primary-900/50 dark:text-kiluan-mint">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="mt-3 font-semibold text-primary-800 dark:text-primary-100">{t(`steps.${key}.title`)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t(`steps.${key}.body`)}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}

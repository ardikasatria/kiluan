import { getTranslations } from 'next-intl/server'
import { BanknotesIcon, ShieldCheckIcon, UserGroupIcon } from '@heroicons/react/24/outline'

const PILLAR_KEYS = ['dataOwnership', 'localValue', 'conservation'] as const
const PILLAR_ICONS = [ShieldCheckIcon, UserGroupIcon, BanknotesIcon] as const

export default async function HomeValuePillars() {
  const t = await getTranslations('landing.valuePillars')

  return (
    <section className="border-b border-neutral-200/70 bg-white/35 py-16 backdrop-blur-sm dark:border-neutral-800/70 dark:bg-neutral-900/25 sm:py-20">
      <div className="container">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">{t('title')}</h2>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
        </div>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PILLAR_KEYS.map((key, i) => {
            const Icon = PILLAR_ICONS[i]!
            return (
              <li
                key={key}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/60"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-kiluan-mint/25 text-primary-700 dark:bg-primary-900/50 dark:text-kiluan-mint">
                  <Icon className="size-6" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold text-primary-800 dark:text-primary-100">{t(`pillars.${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t(`pillars.${key}.body`)}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  DevicePhoneMobileIcon,
  ShoppingBagIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'

const ROLE_KEYS = ['wisatawan', 'umkm', 'agen', 'pokdarwis'] as const
const ROLE_ICONS = [UserGroupIcon, ShoppingBagIcon, BuildingOffice2Icon, UserGroupIcon] as const
const ROLE_HREFS = [
  '/daftar?peran=wisatawan',
  '/daftar?peran=umkm',
  '/daftar?peran=agen',
  '/daftar?peran=pokdarwis',
] as const

export default async function HomeCta() {
  const t = await getTranslations('landing.communityCta')

  return (
    <section className="py-16 sm:py-20">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-800 via-primary-700 to-kiluan-teal px-6 py-12 sm:px-10 sm:py-14 dark:from-primary-950 dark:via-primary-900 dark:to-kiluan-navy">
          <div className="absolute -top-20 -right-16 size-64 rounded-full bg-kiluan-mint/15 blur-3xl" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-100">
              <DevicePhoneMobileIcon className="size-4" aria-hidden />
              {t('eyebrow')}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{t('title')}</h2>
            <p className="mt-3 max-w-2xl text-primary-50/90">{t('subtitle')}</p>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {ROLE_KEYS.map((key, i) => {
                const Icon = ROLE_ICONS[i]!
                return (
                  <li key={key}>
                    <Link
                      href={ROLE_HREFS[i]!}
                      className="group flex h-full flex-col rounded-2xl border border-white/15 bg-white/8 p-5 backdrop-blur-sm transition hover:border-kiluan-mint/40 hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-kiluan-mint focus-visible:outline-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-kiluan-mint/20 text-kiluan-mint">
                          <Icon className="size-5" aria-hidden />
                        </div>
                        <span className="font-semibold text-white">{t(`roles.${key}.label`)}</span>
                      </div>
                      <p className="mt-3 flex-1 text-sm text-primary-100/85">{t(`roles.${key}.desc`)}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-kiluan-mint group-hover:gap-2">
                        {t('register')}
                        <ArrowRightIcon className="size-4" aria-hidden />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

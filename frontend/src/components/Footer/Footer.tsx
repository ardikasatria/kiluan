import Logo from '@/shared/Logo'
import PwaInstallButton from '@/components/kiluan/PwaInstallButton'
import { getLocale, getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { withLocale } from '@/lib/i18n/locale-path'
import { Mail01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

const FOOTER_COLUMNS = [
  {
    id: 'jelajah',
    titleKey: 'columns.jelajah',
    links: [
      { href: '/', labelKey: 'links.home' },
      { href: '/jelajah', labelKey: 'links.explore' },
      { href: '/jelajah?lensa=wisata', labelKey: 'links.featuredSpots' },
      { href: '/jelajah', labelKey: 'links.findDestinations' },
    ],
  },
  {
    id: 'pengalaman',
    titleKey: 'columns.pengalaman',
    links: [
      { href: '/jelajah?lensa=wisata', labelKey: 'links.packages' },
      { href: '/jelajah', labelKey: 'links.explorer' },
      { href: '/paspor', labelKey: 'links.paspor' },
      { href: '/jelajah', labelKey: 'links.guideEthics' },
    ],
  },
  {
    id: 'pasar',
    titleKey: 'columns.pasar',
    links: [
      { href: '/jelajah', labelKey: 'links.localUmkm' },
      { href: '/jelajah', labelKey: 'links.certificationTiers' },
      { href: '/daftar?peran=umkm', labelKey: 'links.registerUmkm' },
    ],
  },
  {
    id: 'komunitas',
    titleKey: 'columns.komunitas',
    links: [
      { href: '/masuk', labelKey: 'links.signIn' },
      { href: '/daftar', labelKey: 'links.register' },
      { href: '/jelajah?lensa=desa', labelKey: 'links.villagesInNetwork' },
      { href: '/#jejak-regeneratif', labelKey: 'links.regenerativeTrail' },
    ],
  },
] as const

export default async function Footer() {
  const t = await getTranslations('footer')
  const locale = (await getLocale()) as Locale
  const year = new Date().getFullYear()

  const localize = (path: string) => {
    if (path.includes('#')) {
      const [base, hash] = path.split('#')
      return `${withLocale(base || '/', locale)}#${hash}`
    }
    return withLocale(path, locale)
  }

  return (
    <footer className="nc-Footer relative border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="container py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-6 lg:gap-12">
          <div className="lg:col-span-2">
            <Logo size="h-12 w-auto sm:h-14" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t('tagline')}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <PwaInstallButton variant="footer" />
              <a
                href="mailto:sigerciv@sainsdataciv.com"
                className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-primary-700 dark:text-neutral-300 dark:hover:text-primary-300"
              >
                <HugeiconsIcon icon={Mail01Icon} size={18} />
                sigerciv@sainsdataciv.com
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.id}>
                <h2 className="text-sm font-semibold text-primary-800 dark:text-primary-100">
                  {t(col.titleKey)}
                </h2>
                <ul className="mt-4 space-y-3">
                  {col.links.map((item) => (
                    <li key={item.href + item.labelKey}>
                      <Link
                        href={localize(item.href)}
                        className="text-sm text-neutral-600 hover:text-primary-700 dark:text-neutral-400 dark:hover:text-primary-300"
                      >
                        {t(item.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-neutral-200 pt-8 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:text-neutral-500">
          <p>{t('copyright', { year })}</p>
          <p className="text-xs">{t('domainNote')}</p>
        </div>
      </div>
    </footer>
  )
}

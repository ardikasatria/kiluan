import HomeJelajahMap from '@/components/kiluan/home/HomeJelajahMap'
import { daftarDesaDiscovery } from '@/lib/api/discovery'
import type { DestinasiRingkas } from '@/lib/api/types'
import { ArrowRightIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'

interface Props {
  destinasi?: DestinasiRingkas[]
}

export default async function HomeJelajahCta({ destinasi = [] }: Props) {
  const t = await getTranslations('landing.jelajahCta')
  const { item: desa } = await daftarDesaDiscovery({ batas: 24 })

  return (
    <section className="border-t border-neutral-200/70 py-16 dark:border-neutral-800/70 sm:py-20">
      <div className="container">
        <div className="kiluan-glass-panel overflow-hidden">
          <div className="grid lg:grid-cols-2 lg:items-stretch">
            <div className="p-8 sm:p-10 lg:p-12">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
                <GlobeAltIcon className="size-4" aria-hidden />
                {t('eyebrow')}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">{t('title')}</h2>
              <p className="mt-3 max-w-lg text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
              <Link
                href="/jelajah"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-kiluan-mint focus-visible:outline-none dark:bg-primary-600"
              >
                {t('cta')}
                <ArrowRightIcon className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="relative min-h-[260px] border-t border-neutral-200/70 dark:border-neutral-700/70 lg:min-h-[320px] lg:border-t-0 lg:border-s">
              <HomeJelajahMap desa={desa} destinasi={destinasi} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

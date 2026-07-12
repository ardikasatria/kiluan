import DesaCard from '@/components/kiluan/DesaCard'
import { Link } from '@/i18n/navigation'
import type { DesaRingkas } from '@/lib/api/types'
import { ArrowRightIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'
import { getTranslations } from 'next-intl/server'

interface Props {
  desa: DesaRingkas[]
}

export default async function HomeFeaturedDesa({ desa }: Props) {
  const t = await getTranslations('landing.featuredDesa')

  if (desa.length === 0) return null

  return (
    <section className="py-16 sm:py-20">
      <div className="container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
              <BuildingOffice2Icon className="size-4" aria-hidden />
              {t('eyebrow')}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">
              {t('title')}
            </h2>
            <p className="mt-2 max-w-xl text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
          </div>
          <Link
            href="/jelajah"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-600 dark:text-primary-300"
          >
            {t('viewMap')}
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {desa.slice(0, 6).map((d) => (
            <DesaCard key={d.slug} desa={d} />
          ))}
        </div>
      </div>
    </section>
  )
}

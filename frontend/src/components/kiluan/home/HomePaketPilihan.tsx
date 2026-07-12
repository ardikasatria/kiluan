import PaketCard from '@/components/kiluan/pasar/PaketCard'
import type { PaketRingkas } from '@/lib/api/types'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { ArrowRightIcon, TicketIcon } from '@heroicons/react/24/outline'

const DESA = 'teluk-kiluan'

interface Props {
  paket: PaketRingkas[]
}

export default async function HomePaketPilihan({ paket }: Props) {
  const t = await getTranslations('landing.paketPilihan')
  const publik = paket.filter((p) => p.status === 'publikasi').slice(0, 3)

  return (
    <section className="border-t border-neutral-200/70 py-16 dark:border-neutral-800/70 sm:py-20">
      <div className="container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
              <TicketIcon className="size-4" aria-hidden />
              {t('eyebrow')}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">{t('title')}</h2>
            <p className="mt-2 max-w-xl text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
          </div>
          {publik.length > 0 && (
            <Link
              href="/jelajah?lensa=wisata"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-300"
            >
              {t('explorePackages')}
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
          )}
        </div>

        {publik.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {publik.map((p) => (
              <PaketCard key={p.id} paket={p} desaSlug={DESA} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-primary-300/60 bg-primary-50/50 px-6 py-10 text-center dark:border-primary-600/40 dark:bg-primary-900/20">
            <p className="text-lg font-semibold text-primary-800 dark:text-primary-100">{t('emptyTitle')}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">{t('emptyBody')}</p>
            <Link
              href="/jelajah?lensa=wisata"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary-300 px-5 py-2.5 text-sm font-semibold text-primary-800 hover:bg-white dark:border-primary-600 dark:text-primary-100 dark:hover:bg-primary-900/40"
            >
              {t('exploreCta')}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

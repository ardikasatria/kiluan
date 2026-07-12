import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MapIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import Sigerciv404Illustration from '@/components/kiluan/Sigerciv404Illustration'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'

export default async function NotFoundView() {
  const t = await getTranslations('notFound')

  return (
    <main className="container flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center py-16 lg:py-24">
      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
        <div className="order-2 text-center lg:order-1 lg:text-start">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary-200/80 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary-700 backdrop-blur-sm dark:border-primary-700/50 dark:bg-neutral-900/60 dark:text-primary-200">
            <SparklesIcon className="size-3.5" aria-hidden />
            {t('eyebrow')}
          </p>

          <p className="mt-6 text-6xl font-extrabold tracking-tight text-primary-800/15 sm:text-7xl dark:text-primary-100/10">
            {t('code')}
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary-900 sm:text-4xl dark:text-primary-50">
            {t('title')}
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
            {t('description')}
          </p>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            {t('hint')}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-primary-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary-800 focus-visible:ring-2 focus-visible:ring-kiluan-mint focus-visible:outline-none dark:bg-primary-600 dark:hover:bg-primary-500"
            >
              <ArrowLeftIcon className="size-4" aria-hidden />
              {t('backHome')}
            </Link>
            <Link
              href="/jelajah"
              className="inline-flex items-center gap-2 rounded-full border border-primary-300/80 bg-white/70 px-6 py-3 text-sm font-semibold text-primary-800 backdrop-blur-sm transition hover:bg-primary-50 focus-visible:ring-2 focus-visible:ring-kiluan-mint focus-visible:outline-none dark:border-primary-600 dark:bg-neutral-900/50 dark:text-primary-100 dark:hover:bg-primary-950/40"
            >
              <MapIcon className="size-4" aria-hidden />
              {t('explore')}
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="kiluan-glass-panel relative overflow-hidden p-4 sm:p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-kiluan-mint/25 blur-3xl dark:bg-kiluan-mint/10"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-12 -left-8 size-44 rounded-full bg-primary-700/10 blur-3xl dark:bg-primary-500/10"
            />
            <Sigerciv404Illustration className="relative mx-auto w-full max-w-md" title={t('illustrationAlt')} />
          </div>
        </div>
      </div>
    </main>
  )
}

import { getTranslations } from 'next-intl/server'
import { ChartBarIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

export default async function HomeJejakRegeneratif() {
  const t = await getTranslations('landing.jejakRegeneratif')

  return (
    <section id="jejak-regeneratif" className="scroll-mt-24 border-y border-neutral-200/70 bg-white/35 py-16 backdrop-blur-sm dark:border-neutral-800/70 dark:bg-neutral-900/25 sm:py-20">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
            <ChartBarIcon className="size-4" aria-hidden />
            {t('eyebrow')}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">{t('title')}</h2>
          <p className="mt-4 leading-relaxed text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-700 dark:bg-neutral-800/60">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-kiluan-mint/20 text-primary-700 dark:bg-primary-900/50 dark:text-kiluan-mint">
              <ShieldCheckIcon className="size-6" aria-hidden />
            </div>
            <h3 className="mt-4 font-semibold text-primary-800 dark:text-primary-100">{t('commitmentTitle')}</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{t('commitmentBody')}</p>
          </div>
          <div className="rounded-2xl border border-dashed border-primary-300/60 bg-primary-50/40 p-6 text-center dark:border-primary-600/40 dark:bg-primary-900/20">
            <p className="text-sm font-medium text-primary-700 dark:text-primary-300">{t('targetLabel')}</p>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{t('targetBody')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

import type { Kategori } from '@/lib/api/types'
import type { Locale } from '@/i18n/routing'
import { labelKategori } from '@/lib/i18n/referensi'
import { Link } from '@/i18n/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { TagIcon } from '@heroicons/react/24/outline'

interface Props {
  kategori: Kategori[]
}

export default async function HomeCategoryChips({ kategori }: Props) {
  if (kategori.length === 0) return null

  const t = await getTranslations('landing.categoryChips')
  const locale = (await getLocale()) as Locale

  return (
    <section className="border-b border-neutral-200/70 py-10 dark:border-neutral-800/70 sm:py-12">
      <div className="container">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
          <TagIcon className="size-4" aria-hidden />
          {t('eyebrow')}
        </p>
        <h2 className="mt-1 text-xl font-bold text-primary-800 sm:text-2xl dark:text-primary-100">{t('title')}</h2>
        <ul className="mt-5 flex flex-wrap gap-2.5">
          {kategori.map((k) => (
            <li key={k.id}>
              <Link
                href={`/jelajah?kategori=${k.kode}&lensa=wisata`}
                className="inline-flex rounded-full border border-primary-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-primary-800 transition hover:border-kiluan-sea hover:bg-kiluan-mint/20 hover:text-primary-900 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none dark:border-primary-700/60 dark:bg-neutral-900/60 dark:text-primary-100 dark:hover:border-kiluan-sea dark:hover:bg-primary-900/50"
              >
                {labelKategori(k.kode, locale, k.nama)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

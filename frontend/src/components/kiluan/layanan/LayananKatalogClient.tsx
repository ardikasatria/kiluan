'use client'

import type { LayananItem } from '@/lib/api/types'
import { formatHarga } from '@/lib/kiluan/pasar'
import { HomeIcon } from '@heroicons/react/24/outline'
import { Link } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'

interface Props {
  desaSlug: string
  desaNama: string
  jenis: string
  layanan: LayananItem[]
}

export default function LayananKatalogClient({ desaSlug, desaNama, jenis, layanan }: Props) {
  const t = useTranslations('layananKatalog')
  const tJenis = useTranslations('kelola.layanan.jenisOpsi')
  const locale = useLocale()
  const localeTag = locale === 'en' ? 'en-ID' : 'id-ID'

  const labelJenis = (() => {
    try {
      return tJenis(jenis as 'penginapan')
    } catch {
      return jenis.replace(/_/g, ' ')
    }
  })()

  const publik = layanan.filter((l) => l.status === 'publikasi')

  return (
    <div className="pb-20">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-kiluan-sea/15 via-primary-50 to-white dark:border-neutral-800 dark:from-neutral-950 dark:via-primary-950/60 dark:to-neutral-900">
        <div className="container py-10 sm:py-12">
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{desaNama}</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold text-primary-800 dark:text-primary-100">
            <HomeIcon className="size-8 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
            {labelJenis}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
            {t('subtitle', { jenis: labelJenis, desa: desaNama })}
          </p>
        </div>
      </div>

      <div className="container py-10">
        {publik.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-600">
            <p className="text-neutral-600 dark:text-neutral-400">{t('empty', { jenis: labelJenis })}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
              <Link
                href={`/${desaSlug}`}
                className="font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                {t('backEtalase')}
              </Link>
              <Link
                href={`/${desaSlug}/pasar`}
                className="font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                {t('linkPasar')}
              </Link>
            </div>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publik.map((l) => (
              <li
                key={l.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/50"
              >
                <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">{l.nama}</h2>
                {l.penyedia?.nama && (
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{l.penyedia.nama}</p>
                )}
                {l.deskripsi && (
                  <p className="mt-2 line-clamp-3 text-sm text-neutral-600 dark:text-neutral-400">{l.deskripsi}</p>
                )}
                <p className="mt-3 text-lg font-bold text-kiluan-sea dark:text-kiluan-mint">
                  {formatHarga(l.harga, l.satuan_harga, localeTag)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

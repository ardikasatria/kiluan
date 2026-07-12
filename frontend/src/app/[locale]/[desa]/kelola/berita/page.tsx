import { getDaftarBerita } from '@/lib/api/berita'
import { getProfilDesa } from '@/lib/api/desa'
import { labelKategoriBerita } from '@/lib/kiluan/berita'
import { metadataKelola } from '@/lib/kiluan/seo'
import { Link } from '@/i18n/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const t = await getTranslations('kelola.berita')
  const profil = await getProfilDesa(desa)
  return metadataKelola(
    profil ? t('seoTitleDesa', { desa: profil.nama }) : t('seoTitle'),
    desa,
  )
}

export default async function KelolaBeritaPage({ params }: Props) {
  const { desa } = await params
  const t = await getTranslations('kelola.berita')
  const tBerita = await getTranslations('berita')
  const locale = await getLocale()
  const tr = tBerita as unknown as (key: string) => string
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  const hasil = await getDaftarBerita(desa, { kelola: true })
  if (!hasil) notFound()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{t('eyebrow')}</p>
          <h2 className="mt-1 text-xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {t('subtitleDesa', { desa: profil.nama })}
          </p>
        </div>
        <Link
          href={`/${desa}/kelola/berita/baru`}
          className="inline-flex shrink-0 justify-center rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          {t('newArticle')}
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-700">
          <thead className="bg-neutral-50 dark:bg-neutral-800/80">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">{t('table.judul')}</th>
              <th className="hidden px-4 py-3 text-left font-medium text-neutral-600 sm:table-cell dark:text-neutral-300">
                {t('table.kategori')}
              </th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">{t('table.status')}</th>
              <th className="hidden px-4 py-3 text-left font-medium text-neutral-600 md:table-cell dark:text-neutral-300">
                {t('table.terbit')}
              </th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">{t('table.aksi')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-700 dark:bg-neutral-900/40">
            {hasil.item.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              hasil.item.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{b.judul}</span>
                    {b.sorotan && (
                      <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        {t('sorotan')}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-neutral-500 sm:table-cell dark:text-neutral-400">
                    {labelKategoriBerita(b.kategori, tr)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        b.status === 'publikasi'
                          ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200'
                          : b.status === 'arsip'
                            ? 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                            : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                      }`}
                    >
                      {t(`status.${b.status ?? 'draft'}` as 'status.draft')}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-neutral-500 md:table-cell dark:text-neutral-400">
                    {b.terbit_pada
                      ? new Date(b.terbit_pada).toLocaleString(locale, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${desa}/kelola/berita/${b.id}`}
                      className="text-primary-700 hover:underline dark:text-primary-300"
                    >
                      {t('edit')}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

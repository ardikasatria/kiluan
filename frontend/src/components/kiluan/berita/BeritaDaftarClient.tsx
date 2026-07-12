'use client'

import BeritaCard from '@/components/kiluan/berita/BeritaCard'
import { getDaftarBerita } from '@/lib/api/berita'
import type { BeritaRingkas, KategoriBerita } from '@/lib/api/types'
import { KODE_KATEGORI_BERITA } from '@/lib/kiluan/berita'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function BeritaDaftarClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('berita')
  const searchParams = useSearchParams()
  const kategoriAwal = searchParams.get('kategori') as KategoriBerita | null
  const tagAwal = searchParams.get('tag')

  const [kategori, setKategori] = useState<KategoriBerita | undefined>(kategoriAwal ?? undefined)
  const [tag, setTag] = useState(tagAwal ?? '')
  const [q, setQ] = useState('')
  const [item, setItem] = useState<BeritaRingkas[]>([])
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getDaftarBerita(desaSlug, {
        kategori,
        tag: tag || undefined,
      })
      let filtered = res.item
      if (q.trim()) {
        const needle = q.toLowerCase()
        filtered = filtered.filter(
          (b) =>
            b.judul.toLowerCase().includes(needle) ||
            b.ringkasan?.toLowerCase().includes(needle),
        )
      }
      setItem(filtered)
    } finally {
      setLoading(false)
    }
  }, [desaSlug, kategori, tag, q])

  useEffect(() => {
    void muat()
  }, [muat])

  const sorotan = item.filter((b) => b.sorotan)
  const reguler = item.filter((b) => !b.sorotan)

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-kiluan-mint/30 via-primary-50 to-white dark:from-primary-950 dark:via-primary-900 dark:to-neutral-950">
        <div className="container py-10 sm:py-12">
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary-800 dark:text-primary-100">{t('title')}</h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
        </div>
      </div>

      <div className="container py-8 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative min-w-[200px] flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              placeholder={t('searchPlaceholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 py-2.5 pr-4 pl-10 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
          </div>
          <select
            value={kategori ?? ''}
            onChange={(e) => setKategori((e.target.value as KategoriBerita) || undefined)}
            className="rounded-xl border border-neutral-300 px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          >
            <option value="">{t('allCategories')}</option>
            {KODE_KATEGORI_BERITA.map((kode) => (
              <option key={kode} value={kode}>
                {t(`kategori.${kode}`)}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder={t('tagFilter')}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="rounded-xl border border-neutral-300 px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900 sm:w-40"
          />
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-neutral-500">{t('loadingArticles')}</p>
        ) : item.length === 0 ? (
          <p className="py-16 text-center text-sm text-neutral-500">{t('empty')}</p>
        ) : (
          <div className="mt-8 space-y-10">
            {sorotan.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-semibold text-primary-800 dark:text-primary-100">{t('featured')}</h2>
                <div className="space-y-6">
                  {sorotan.map((b) => (
                    <BeritaCard key={b.id} berita={b} desaSlug={desaSlug} featured />
                  ))}
                </div>
              </section>
            )}
            {reguler.length > 0 && (
              <section>
                {sorotan.length > 0 && (
                  <h2 className="mb-4 text-lg font-semibold text-primary-800 dark:text-primary-100">{t('others')}</h2>
                )}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {reguler.map((b) => (
                    <BeritaCard key={b.id} berita={b} desaSlug={desaSlug} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

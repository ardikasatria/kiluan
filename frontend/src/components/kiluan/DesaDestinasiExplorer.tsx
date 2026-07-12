'use client'

import DestinasiCard from '@/components/kiluan/DestinasiCard'
import { cariDestinasi } from '@/lib/api/destinasi'
import type { DestinasiRingkas, Kategori, MetaPaginasi } from '@/lib/api/types'
import { ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo, useState, useTransition } from 'react'

interface Props {
  desaSlug: string
  initial: DestinasiRingkas[]
  meta: MetaPaginasi
  kategori: Kategori[]
}

export default function DesaDestinasiExplorer({ desaSlug, initial, meta: initialMeta, kategori }: Props) {
  const t = useTranslations('etalase.explorer')
  const [q, setQ] = useState('')
  const [kategoriId, setKategoriId] = useState<number | ''>('')
  const [items, setItems] = useState(initial)
  const [meta, setMeta] = useState(initialMeta)
  const [pending, startTransition] = useTransition()

  const kategoriMap = useMemo(() => new Map(kategori.map((k) => [k.id, k])), [kategori])

  const fetchItems = useCallback(
    (append = false) => {
      startTransition(async () => {
        const res = await cariDestinasi(desaSlug, {
          q: q || undefined,
          kategori: kategoriId || undefined,
          batas: 12,
        })
        setItems((prev) => (append ? [...prev, ...res.item] : res.item))
        setMeta(res.meta)
      })
    },
    [desaSlug, q, kategoriId],
  )

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/60 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="sr-only">{t('searchLabel')}</span>
          <span className="relative block">
            <MagnifyingGlassIcon
              className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchItems(false)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pr-3 pl-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-primary-500 dark:focus:ring-primary-800"
            />
          </span>
        </label>
        <select
          value={kategoriId}
          onChange={(e) => setKategoriId(e.target.value ? Number(e.target.value) : '')}
          className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm sm:w-44 dark:border-neutral-600 dark:bg-neutral-900"
          aria-label={t('filterLabel')}
        >
          <option value="">{t('allCategories')}</option>
          {kategori.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => fetchItems(false)}
          disabled={pending}
          className="rounded-xl bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 dark:bg-primary-600"
        >
          {t('search')}
        </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 px-6 py-12 text-center text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
          {t('empty')}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d) => (
            <DestinasiCard key={d.id} desaSlug={desaSlug} destinasi={d} kategori={kategoriMap.get(d.kategori_id)} />
          ))}
        </div>
      )}

      {meta.ada_lagi && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => fetchItems(true)}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full border border-primary-300 bg-primary-50 px-6 py-2.5 text-sm font-semibold text-primary-800 dark:border-primary-600 dark:bg-primary-900/40 dark:text-primary-100"
          >
            {pending && <ArrowPathIcon className="size-4 animate-spin" aria-hidden />}
            {t('loadMore')}
          </button>
        </div>
      )}
    </div>
  )
}

'use client'

import MisiCard from '@/components/kiluan/penjelajah/MisiCard'
import { Link } from '@/i18n/navigation'
import { getMisi, getPasporSaya } from '@/lib/api/penjelajah'
import type { MisiRingkas } from '@/lib/api/types'
import { KATEGORI_MISI, kategoriBelajarTerverifikasi } from '@/lib/kiluan/penjelajah'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function MisiClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('misi')
  const [kategori, setKategori] = useState('')
  const [jenis, setJenis] = useState('')
  const [misi, setMisi] = useState<MisiRingkas[]>([])
  const [katUnlock, setKatUnlock] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  function labelKategori(k: string) {
    if (!k) return t('kategori.semua')
    if (k === 'mangrove') return t('kategori.mangrove')
    if (k === 'karang') return t('kategori.karang')
    if (k === 'sampah') return t('kategori.sampah')
    if (k === 'lumba') return t('kategori.lumba')
    if (k === 'budaya') return t('kategori.budaya')
    return k
  }

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const params: { kategori?: string; jenis?: string } = {}
      if (kategori) params.kategori = kategori
      if (jenis) params.jenis = jenis
      const [res, belajar] = await Promise.all([
        getMisi(desaSlug, Object.keys(params).length ? params : undefined),
        getMisi(desaSlug, { jenis: 'belajar' }),
      ])
      setMisi(res.item)
      const belajarMap = new Map(belajar.item.map((m) => [m.id, m]))
      try {
        const paspor = await getPasporSaya(desaSlug)
        setKatUnlock(kategoriBelajarTerverifikasi(paspor, belajarMap))
      } catch {
        setKatUnlock(new Set())
      }
    } finally {
      setLoading(false)
    }
  }, [desaSlug, kategori, jenis])

  useEffect(() => {
    void muat()
  }, [muat])

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-emerald-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-primary-600 dark:text-primary-400">{desaNama}</p>
              <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h1>
              <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm">
              <Link href={`/${desaSlug}/paspor`} className="text-primary-600 hover:underline dark:text-primary-400">
                {t('pasporLink')}
              </Link>
              <Link href={`/${desaSlug}/stasiun-lestari`} className="text-primary-600 hover:underline dark:text-primary-400">
                {t('stasiunLink')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="mb-4 flex flex-wrap gap-2">
          {(['', 'belajar', 'aksi'] as const).map((j) => (
            <button
              key={j || 'all-jenis'}
              type="button"
              onClick={() => setJenis(j)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                jenis === j
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {j ? t(`jenis.${j}`) : t('filter.semuaJenis')}
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {KATEGORI_MISI.map((kode) => (
            <button
              key={kode || 'all'}
              type="button"
              onClick={() => setKategori(kode)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                kategori === kode
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {labelKategori(kode)}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
        ) : misi.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('empty')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {misi.map((m) => (
              <MisiCard
                key={m.id}
                misi={m}
                desaSlug={desaSlug}
                katUnlock={katUnlock}
                labelKategori={labelKategori}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

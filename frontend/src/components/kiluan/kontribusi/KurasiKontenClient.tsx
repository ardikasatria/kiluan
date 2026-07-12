'use client'

import { getAntreanKurasi, transisiKontribusi } from '@/lib/api/kontribusi'
import { pesanGalat } from '@/lib/api/galat'
import type { KontribusiItem } from '@/lib/api/types'
import { Link } from '@/i18n/navigation'
import {
  labelTipeKontribusi,
  perluTombolTerapkan,
  ringkasanMuatan,
  urlTerapkan,
} from '@/lib/kiluan/kontribusi'
import { formatTanggal } from '@/lib/kiluan/lencana'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

const TIPE_FILTER = ['foto', 'tips', 'koreksi_data', 'spot_baru'] as const

export default function KurasiKontenClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.kurasiKonten')
  const tKontribusi = useTranslations('kontribusi')
  const tr = tKontribusi as unknown as (key: string) => string
  const [tab, setTab] = useState<'menunggu' | 'terapkan'>('menunggu')
  const [filterTipe, setFilterTipe] = useState('')
  const [antrean, setAntrean] = useState<KontribusiItem[]>([])
  const [disetujui, setDisetujui] = useState<KontribusiItem[]>([])
  const [catatan, setCatatan] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [aksiId, setAksiId] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const opts = filterTipe ? { tipe: filterTipe } : undefined
      const [menunggu, ok] = await Promise.all([
        getAntreanKurasi(desaSlug, { ...opts, status: 'menunggu' }),
        getAntreanKurasi(desaSlug, { ...opts, status: 'disetujui' }),
      ])
      setAntrean(menunggu.item)
      setDisetujui(ok.item.filter((k) => k.tipe === 'koreksi_data' || k.tipe === 'spot_baru'))
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, filterTipe, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  async function keputusan(id: string, aksi: 'setuju' | 'tolak' | 'minta_revisi') {
    setGalat(null)
    setSukses(null)
    setAksiId(id)
    try {
      await transisiKontribusi(desaSlug, id, aksi, catatan[id] ?? '')
      setSukses(t(`sukses.${aksi}`))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setAksiId(null)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>

      <div className="flex flex-wrap items-center gap-3">
        {(['menunggu', 'terapkan'] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-medium',
              tab === tabKey
                ? 'bg-primary-700 text-white'
                : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
            )}
          >
            {tabKey === 'menunggu' ? t('tabMenunggu') : t('tabTerapkan')}
            {tabKey === 'menunggu' && antrean.length > 0 && (
              <span className="ms-1.5 rounded-full bg-white/20 px-1.5 text-xs">{antrean.length}</span>
            )}
          </button>
        ))}
        {tab === 'menunggu' && (
          <select
            value={filterTipe}
            onChange={(e) => setFilterTipe(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            aria-label={t('filterTipe')}
          >
            <option value="">{t('filterSemuaTipe')}</option>
            {TIPE_FILTER.map((tp) => (
              <option key={tp} value={tp}>
                {labelTipeKontribusi(tp, tr)}
              </option>
            ))}
          </select>
        )}
      </div>

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}
      {sukses && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
          {sukses}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">{t('loading')}</p>
      ) : tab === 'menunggu' ? (
        antrean.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('emptyMenunggu')}</p>
        ) : (
          <ul className="space-y-4">
            {antrean.map((k) => (
              <li key={k.id} className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-primary-800 dark:text-primary-100">
                    {labelTipeKontribusi(k.tipe, tr)} · {k.target_tipe}
                  </p>
                  {k.dibuat_pada && (
                    <time className="text-xs text-neutral-500" dateTime={k.dibuat_pada}>
                      {formatTanggal(k.dibuat_pada, locale === 'en' ? 'en-US' : 'id-ID')}
                    </time>
                  )}
                </div>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{ringkasanMuatan(k, tr)}</p>
                <textarea
                  placeholder={t('catatanPlaceholder')}
                  value={catatan[k.id] ?? ''}
                  onChange={(e) => setCatatan((p) => ({ ...p, [k.id]: e.target.value }))}
                  className="mt-3 w-full rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                  rows={2}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={aksiId === k.id}
                    onClick={() => void keputusan(k.id, 'setuju')}
                    className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {aksiId === k.id ? t('memproses') : t('setujui')}
                  </button>
                  <button
                    type="button"
                    disabled={aksiId === k.id}
                    onClick={() => void keputusan(k.id, 'minta_revisi')}
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-neutral-600"
                  >
                    {t('mintaRevisi')}
                  </button>
                  <button
                    type="button"
                    disabled={aksiId === k.id}
                    onClick={() => void keputusan(k.id, 'tolak')}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 disabled:opacity-50"
                  >
                    {t('tolak')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : disetujui.length === 0 ? (
        <p className="text-sm text-neutral-500">{t('emptyTerapkan')}</p>
      ) : (
        <ul className="space-y-4">
          {disetujui.map((k) => (
            <li key={k.id} className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
              <p className="font-semibold text-primary-800 dark:text-primary-100">
                {labelTipeKontribusi(k.tipe, tr)}
              </p>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{ringkasanMuatan(k, tr)}</p>
              <div className="mt-3">
                <TerapkanSaran desaSlug={desaSlug} item={k} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-neutral-500">{t('footnote')}</p>
    </div>
  )
}

export function TerapkanSaran({ desaSlug, item }: { desaSlug: string; item: KontribusiItem }) {
  const t = useTranslations('kelola.kurasiKonten')
  if (!perluTombolTerapkan(item)) return null
  const url = urlTerapkan(desaSlug, item)
  if (!url) return null
  return (
    <Link href={url} className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
      {t('terapkan')}
    </Link>
  )
}

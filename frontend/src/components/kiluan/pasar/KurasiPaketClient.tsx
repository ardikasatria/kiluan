'use client'

import { pesanGalat } from '@/lib/api/galat'
import { formatHarga, labelStatusPaket, warnaStatusPaket } from '@/lib/kiluan/pasar'
import { getDaftarPaket, getKurasiLog, transisiPaket } from '@/lib/api/pasar'
import type { KurasiLogItem, PaketRingkas } from '@/lib/api/types'
import { Link } from '@/i18n/navigation'
import { formatTanggal } from '@/lib/kiluan/lencana'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

export default function KurasiPaketClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.kurasiPaket')
  const tr = t as unknown as (key: string) => string
  const [antrean, setAntrean] = useState<PaketRingkas[]>([])
  const [log, setLog] = useState<KurasiLogItem[]>([])
  const [catatan, setCatatan] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [aksiId, setAksiId] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)
  const [tampilLog, setTampilLog] = useState(false)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const [res, logRes] = await Promise.all([
        getDaftarPaket(desaSlug, { kelola: true, status: 'review' }),
        getKurasiLog(desaSlug),
      ])
      setAntrean(res.item)
      setLog(logRes.item.slice(0, 10))
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  async function keputusan(paketId: string, aksi: 'setuju' | 'tolak' | 'minta_revisi') {
    setGalat(null)
    setSukses(null)
    setAksiId(paketId)
    try {
      await transisiPaket(desaSlug, paketId, aksi, catatan[paketId] ?? '')
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
      ) : antrean.length === 0 ? (
        <p className="text-sm text-neutral-500">{t('empty')}</p>
      ) : (
        <ul className="space-y-4">
          {antrean.map((p) => (
            <li key={p.id} className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-primary-800 dark:text-primary-100">{p.nama}</h3>
                  <p className="text-sm text-neutral-500">
                    {p.agen.nama} · {formatHarga(p.harga, p.satuan_harga)} · {p.durasi_jam} {t('jam')}
                  </p>
                  <Link
                    href={`/${desaSlug}/paket/${p.id}`}
                    className="mt-1 inline-block text-xs text-primary-600 hover:underline dark:text-primary-400"
                  >
                    {t('lihatDetail')}
                  </Link>
                </div>
                <span className={clsx('rounded-full px-2 py-0.5 text-xs ring-1', warnaStatusPaket(p.status))}>
                  {labelStatusPaket(p.status, tr)}
                </span>
              </div>
              <textarea
                placeholder={t('catatanPlaceholder')}
                value={catatan[p.id] ?? ''}
                onChange={(e) => setCatatan((prev) => ({ ...prev, [p.id]: e.target.value }))}
                className="mt-3 w-full rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                rows={2}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={aksiId === p.id}
                  onClick={() => void keputusan(p.id, 'setuju')}
                  className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {aksiId === p.id ? t('memproses') : t('setujui')}
                </button>
                <button
                  type="button"
                  disabled={aksiId === p.id}
                  onClick={() => void keputusan(p.id, 'minta_revisi')}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-neutral-600"
                >
                  {t('mintaRevisi')}
                </button>
                <button
                  type="button"
                  disabled={aksiId === p.id}
                  onClick={() => void keputusan(p.id, 'tolak')}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 disabled:opacity-50"
                >
                  {t('tolak')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {log.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => setTampilLog((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {t('logTitle')}
            <span className="text-xs text-neutral-500">{tampilLog ? '▲' : '▼'}</span>
          </button>
          {tampilLog && (
            <ul className="divide-y divide-neutral-100 border-t border-neutral-200 px-4 dark:divide-neutral-800 dark:border-neutral-700">
              {log.map((entry) => (
                <li key={entry.id} className="py-2 text-xs text-neutral-600 dark:text-neutral-400">
                  {entry.keputusan} · {entry.entitas_tipe} {entry.entitas_id?.slice(0, 8)}…
                  {entry.dari_status && entry.ke_status && (
                    <> ({entry.dari_status} → {entry.ke_status})</>
                  )}
                  {entry.dibuat_pada && (
                    <> · {formatTanggal(entry.dibuat_pada, locale === 'en' ? 'en-US' : 'id-ID')}</>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

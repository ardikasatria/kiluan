'use client'

import { pesanGalat } from '@/lib/api/galat'
import { finalkanLaporan, generateLaporan, getLaporanDaftar } from '@/lib/api/analitik'
import type { LaporanBulananDto } from '@/lib/api/types'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

function periodeSaatIni() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function LaporanClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('anjungan.laporan')
  const locale = useLocale() as 'id' | 'en'
  const [rows, setRows] = useState<LaporanBulananDto[]>([])
  const [periode, setPeriode] = useState(periodeSaatIni)
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const res = await getLaporanDaftar(desaSlug)
      setRows(res.item)
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  async function buatDraf() {
    setGalat(null)
    setSukses(null)
    try {
      await generateLaporan(desaSlug, periode)
      setSukses(t('drafOk'))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    }
  }

  async function finalkan(id: string) {
    setGalat(null)
    try {
      await finalkanLaporan(desaSlug, id)
      setSukses(t('finalOk'))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    }
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-neutral-50 dark:bg-neutral-900/40">
        <div className="container py-10">
          <p className="text-sm text-primary-600">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
        </div>
      </div>
      <div className="container max-w-2xl space-y-6 py-8">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-primary-300 p-4">
          <label className="text-sm">
            <span className="font-medium">{t('periode')}</span>
            <input
              type="month"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="mt-1 block rounded-lg border px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
            />
          </label>
          <button type="button" onClick={() => void buatDraf()} className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white">
            {t('buatDraf')}
          </button>
        </div>
        {galat && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{galat}</p>}
        {sukses && <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800">{sukses}</p>}
        {loading ? (
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('empty')}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                <div>
                  <p className="font-medium">{r.periode}</p>
                  <p className="text-sm text-neutral-500">{t(`status.${r.status}`)}</p>
                </div>
                {r.status === 'draf' && (
                  <button
                    type="button"
                    onClick={() => void finalkan(r.id)}
                    className="rounded-lg border border-primary-600 px-3 py-1.5 text-sm font-medium text-primary-700"
                  >
                    {t('finalkan')}
                  </button>
                )}
                {r.status === 'final' && r.file_media_id && (
                  <span className="text-sm text-emerald-700">{t('pdfTersedia')}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

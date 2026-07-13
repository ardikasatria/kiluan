'use client'

import { cariDestinasiKelola } from '@/lib/api/destinasi'
import { pesanGalat } from '@/lib/api/galat'
import { getDayaDukung, upsertDayaDukung } from '@/lib/api/lestari'
import type { DayaDukungDto } from '@/lib/api/types'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function DayaDukungClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('lestari.dayaDukung')
  const locale = useLocale() as 'id' | 'en'
  const [destinasi, setDestinasi] = useState<{ id: string; nama: string }[]>([])
  const [config, setConfig] = useState<Record<string, DayaDukungDto>>({})
  const [pilih, setPilih] = useState('')
  const [kap, setKap] = useState('100')
  const [kuning, setKuning] = useState('0.7')
  const [merah, setMerah] = useState('0.9')
  const [loading, setLoading] = useState(true)
  const [proses, setProses] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState(false)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const [dest, dd] = await Promise.all([
        cariDestinasiKelola(desaSlug),
        getDayaDukung(desaSlug),
      ])
      setDestinasi(dest.item.map((d) => ({ id: d.id, nama: d.nama })))
      const map: Record<string, DayaDukungDto> = {}
      for (const row of dd.item) map[row.destinasi_id] = row
      setConfig(map)
      if (dest.item[0]) setPilih(dest.item[0].id)
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  useEffect(() => {
    const c = config[pilih]
    if (c) {
      setKap(String(c.kapasitas_harian))
      setKuning(String(c.ambang_kuning))
      setMerah(String(c.ambang_merah))
    }
  }, [pilih, config])

  async function simpan() {
    if (!pilih) return
    setProses(true)
    setGalat(null)
    setSukses(false)
    try {
      await upsertDayaDukung(desaSlug, pilih, {
        kapasitas_harian: Number(kap),
        ambang_kuning: Number(kuning),
        ambang_merah: Number(merah),
      })
      setSukses(true)
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    } finally {
      setProses(false)
    }
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-emerald-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <p className="text-sm text-primary-600 dark:text-primary-400">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h1>
          <p className="mt-2 max-w-xl text-sm text-amber-800 dark:text-amber-200">{t('fgdNote')}</p>
        </div>
      </div>
      <div className="container max-w-lg py-8">
        {loading ? (
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void simpan()
            }}
          >
            {galat && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{galat}</p>}
            {sukses && <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800">{t('saved')}</p>}
            <label className="block text-sm">
              <span className="font-medium">{t('destinasi')}</span>
              <select
                value={pilih}
                onChange={(e) => setPilih(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
              >
                {destinasi.map((d) => (
                  <option key={d.id} value={d.id}>{d.nama}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">{t('kapasitas')}</span>
              <input type="number" min={1} value={kap} onChange={(e) => setKap(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900" required />
            </label>
            <label className="block text-sm">
              <span className="font-medium">{t('ambangKuning')}</span>
              <input type="number" step="0.01" min={0} max={1} value={kuning} onChange={(e) => setKuning(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900" required />
            </label>
            <label className="block text-sm">
              <span className="font-medium">{t('ambangMerah')}</span>
              <input type="number" step="0.01" min={0} max={1} value={merah} onChange={(e) => setMerah(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900" required />
            </label>
            <button type="submit" disabled={proses} className="w-full rounded-xl bg-primary-700 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {proses ? t('saving') : t('submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

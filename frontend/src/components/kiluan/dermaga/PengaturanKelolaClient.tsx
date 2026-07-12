'use client'

import { pesanGalat } from '@/lib/api/galat'
import { getPengaturanDesa, patchPengaturanDesa } from '@/lib/api/uang'
import type { PengaturanDesa } from '@/lib/api/types'
import { ExclamationTriangleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

export default function PengaturanKelolaClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.pengaturan')
  const [data, setData] = useState<PengaturanDesa | null>(null)
  const [loading, setLoading] = useState(true)
  const [menyimpan, setMenyimpan] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)
  const [form, setForm] = useState({
    persen_fee_platform: '',
    batas_hold_menit: '',
    gateway: 'manual',
  })

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const p = await getPengaturanDesa(desaSlug)
      setData(p)
      setForm({
        persen_fee_platform: String(p.persen_fee_platform),
        batas_hold_menit: String(p.batas_hold_menit),
        gateway: p.gateway || 'manual',
      })
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  async function simpan(e: React.FormEvent) {
    e.preventDefault()
    setMenyimpan(true)
    setGalat(null)
    setSukses(null)
    try {
      await patchPengaturanDesa(desaSlug, {
        persen_fee_platform: Number(form.persen_fee_platform),
        batas_hold_menit: Number(form.batas_hold_menit),
        gateway: form.gateway,
      })
      setSukses(t('sukses'))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMenyimpan(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('desc')}</p>

      <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/70 dark:bg-amber-950/30">
        <div className="flex gap-3">
          <ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
          <div>
            <h2 className="font-semibold text-amber-900 dark:text-amber-100">{t('fgdTitle')}</h2>
            <p className="mt-1 text-sm leading-relaxed text-amber-800 dark:text-amber-200">{t('fgdBody')}</p>
            {data && (
              <p className="mt-3 text-sm font-medium text-amber-900 dark:text-amber-100">
                {t('reinvestSaatIni', { persen: data.persen_reinvestasi })}
              </p>
            )}
          </div>
        </div>
      </aside>

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}
      {sukses && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
          {sukses}
        </p>
      )}

      <form
        onSubmit={(e) => void simpan(e)}
        className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40"
      >
        <div className="flex items-center gap-2">
          <Cog6ToothIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{t('formTitle')}</h3>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{t('feePlatform')}</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              required
              value={form.persen_fee_platform}
              onChange={(e) => setForm((f) => ({ ...f, persen_fee_platform: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
            />
            <span className="mt-1 block text-xs text-neutral-500">{t('feeHint')}</span>
          </label>
          <label className="text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{t('batasHold')}</span>
            <input
              type="number"
              min={5}
              required
              value={form.batas_hold_menit}
              onChange={(e) => setForm((f) => ({ ...f, batas_hold_menit: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
            />
            <span className="mt-1 block text-xs text-neutral-500">{t('batasHoldHint')}</span>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{t('gateway')}</span>
            <select
              value={form.gateway}
              onChange={(e) => setForm((f) => ({ ...f, gateway: e.target.value }))}
              className="mt-1 w-full max-w-xs rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
            >
              <option value="manual">{t('gatewayManual')}</option>
            </select>
            <span className="mt-1 block text-xs text-neutral-500">{t('gatewayHint')}</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={menyimpan}
          className="mt-6 rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
        >
          {menyimpan ? t('menyimpan') : t('simpan')}
        </button>
      </form>
    </div>
  )
}

'use client'

import { checkinBooking } from '@/lib/api/dermaga'
import { pesanGalat } from '@/lib/api/galat'
import { QrCodeIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

interface Props {
  desaSlug: string
}

export default function CheckinClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.checkin')
  const tr = t as unknown as (key: string) => string
  const [kode, setKode] = useState('')
  const [sukses, setSukses] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!kode.trim()) return
    setLoading(true)
    setGalat(null)
    setSukses(null)
    try {
      const bk = await checkinBooking(desaSlug, kode.trim())
      const statusLabel = tr(`status.${bk.status}`)
      setSukses(t('sukses', { kode: bk.kode_checkin, status: statusLabel }))
      setKode('')
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en') || t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('desc')}</p>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900/40">
        <div className="flex items-center gap-2">
          <QrCodeIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('formLabel')}</p>
        </div>

        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-4">
          <input
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            placeholder={t('placeholder')}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 font-mono text-sm dark:border-neutral-600 dark:bg-neutral-900"
            autoComplete="off"
            aria-label={t('placeholder')}
          />
          <button
            type="submit"
            disabled={loading || !kode.trim()}
            className="w-full rounded-full bg-primary-700 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {loading ? t('memproses') : t('submit')}
          </button>
        </form>
      </div>

      {sukses && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
          {sukses}
        </p>
      )}
      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}
    </div>
  )
}

'use client'

import { pesanGalat } from '@/lib/api/galat'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

export type AksiKurator = 'setuju' | 'tolak' | 'minta_revisi'

interface Props {
  /** Status entitas saat panel ditampilkan (menunggu / review). */
  aktif: boolean
  onKeputusan: (aksi: AksiKurator, catatan: string) => Promise<void>
  labelSetuju?: string
  /** Sembunyikan aksi minta revisi (mis. panel verifikator penjelajah). */
  sembunyikanRevisi?: boolean
  className?: string
}

export default function PanelKeputusan({
  aktif,
  onKeputusan,
  labelSetuju,
  sembunyikanRevisi,
  className,
}: Props) {
  const t = useTranslations('kelola.kurasi.panel')
  const locale = useLocale()
  const [catatan, setCatatan] = useState('')
  const [memuat, setMemuat] = useState<AksiKurator | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [konfirmasiTolak, setKonfirmasiTolak] = useState(false)

  if (!aktif) return null

  async function jalankan(aksi: AksiKurator) {
    if ((aksi === 'tolak' || aksi === 'minta_revisi') && !catatan.trim()) {
      setGalat(t('catatanWajib'))
      return
    }
    if (aksi === 'tolak' && !konfirmasiTolak) {
      setKonfirmasiTolak(true)
      return
    }
    setGalat(null)
    setMemuat(aksi)
    try {
      await onKeputusan(aksi, catatan.trim())
      setCatatan('')
      setKonfirmasiTolak(false)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMemuat(null)
    }
  }

  return (
    <div className={clsx('rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-800/40', className)}>
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('title')}</h3>
      <label className="mt-3 block text-sm">
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{t('catatanLabel')}</span>
        <textarea
          value={catatan}
          onChange={(e) => {
            setCatatan(e.target.value)
            setGalat(null)
            setKonfirmasiTolak(false)
          }}
          placeholder={t('catatanPlaceholder')}
          rows={3}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
        />
        <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">{t('catatanHint')}</span>
      </label>

      {galat && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}

      {konfirmasiTolak && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          {t('konfirmasiTolak')}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={memuat !== null}
          onClick={() => void jalankan('setuju')}
          className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50"
        >
          {memuat === 'setuju' ? t('memproses') : (labelSetuju ?? t('setujui'))}
        </button>
        {!sembunyikanRevisi && (
          <button
            type="button"
            disabled={memuat !== null}
            onClick={() => void jalankan('minta_revisi')}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200"
          >
            {memuat === 'minta_revisi' ? t('memproses') : t('mintaRevisi')}
          </button>
        )}
        <button
          type="button"
          disabled={memuat !== null}
          onClick={() => void jalankan('tolak')}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
        >
          {memuat === 'tolak' ? t('memproses') : konfirmasiTolak ? t('tolakKonfirm') : t('tolak')}
        </button>
        {konfirmasiTolak && (
          <button
            type="button"
            onClick={() => setKonfirmasiTolak(false)}
            className="rounded-lg px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400"
          >
            {t('batal')}
          </button>
        )}
      </div>
    </div>
  )
}

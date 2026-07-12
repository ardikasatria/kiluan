'use client'

import BadgeStatusPengajuan from '@/components/kiluan/naik-kelas/BadgeStatusPengajuan'
import type { KartuAksiItem, PengajuanKartuItem } from '@/lib/api/types'
import { bisaAjukanKartu, labelBuktiDibutuhkan } from '@/lib/kiluan/naik-kelas'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface Props {
  kartu: KartuAksiItem
  pengajuan?: PengajuanKartuItem | null
  tervalidasi?: boolean
  onAjukan?: () => void
  disabled?: boolean
}

export default function KartuAksiCard({ kartu, pengajuan, tervalidasi, onAjukan, disabled }: Props) {
  const t = useTranslations('naikKelas')
  const tLib = t as unknown as (key: string) => string
  const [buka, setBuka] = useState(false)
  const status = pengajuan?.status
  const bolehAjukan = bisaAjukanKartu(status) && !tervalidasi && onAjukan

  return (
    <article
      className={clsx(
        'rounded-2xl border bg-white p-5 shadow-sm transition dark:bg-neutral-900',
        tervalidasi
          ? 'border-emerald-200 dark:border-emerald-900'
          : 'border-neutral-200 dark:border-neutral-700',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-primary-800 dark:text-primary-100">{kartu.nama}</h3>
            {tervalidasi && (
              <BadgeStatusPengajuan status="tervalidasi" />
            )}
            {!tervalidasi && status && (
              <BadgeStatusPengajuan status={status} />
            )}
            {!status && !tervalidasi && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                {t('kartuAksi.belumDiajukan')}
              </span>
            )}
          </div>
          {kartu.deskripsi && (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{kartu.deskripsi}</p>
          )}
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {t('kartuAksi.bobot', {
              bobot: kartu.bobot,
              bukti: labelBuktiDibutuhkan(kartu.bukti_dibutuhkan ?? {}, tLib).join(', '),
            })}
          </p>
        </div>
        {bolehAjukan && (
          <button
            type="button"
            disabled={disabled}
            onClick={onAjukan}
            className="shrink-0 rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50 dark:bg-primary-600"
          >
            {status === 'ditolak' ? t('kartuAksi.ajukanUlang') : t('kartuAksi.ajukan')}
          </button>
        )}
      </div>

      {kartu.kenapa_penting && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setBuka((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl bg-primary-50 px-4 py-3 text-left text-sm font-medium text-primary-900 dark:bg-primary-950/40 dark:text-primary-100"
          >
            {t('kartuAksi.kenapaPentingJudul')}
            {buka ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
          </button>
          {buka && (
            <p className="mt-2 rounded-xl border border-primary-100 bg-white px-4 py-3 text-sm text-neutral-700 dark:border-primary-900 dark:bg-neutral-900/60 dark:text-neutral-300">
              {kartu.kenapa_penting}
            </p>
          )}
        </div>
      )}

      {pengajuan?.catatan && (status === 'revisi' || status === 'ditolak') && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {t('pengajuan.catatan', { catatan: pengajuan.catatan })}
        </p>
      )}
    </article>
  )
}

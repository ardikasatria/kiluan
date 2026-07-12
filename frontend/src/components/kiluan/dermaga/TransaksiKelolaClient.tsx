'use client'

import { pesanGalat } from '@/lib/api/galat'
import { getUmkmKelola } from '@/lib/api/pasar'
import { getTransaksi } from '@/lib/api/uang'
import type { TransaksiDto, UmkmRingkas } from '@/lib/api/types'
import { formatHarga } from '@/lib/kiluan/pasar'
import { formatTanggal } from '@/lib/kiluan/lencana'
import { TableCellsIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

const STATUS_FILTER = ['', 'tertahan_escrow', 'dirilis', 'direfund', 'sebagian_refund'] as const

function badgeStatus(status: string) {
  return clsx(
    'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
    status === 'tertahan_escrow' && 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
    status === 'dirilis' && 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
    status === 'direfund' && 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    status === 'sebagian_refund' && 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200',
    !['tertahan_escrow', 'dirilis', 'direfund', 'sebagian_refund'].includes(status) &&
      'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  )
}

export default function TransaksiKelolaClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.transaksi')
  const tr = t as unknown as (key: string) => string
  const [umkm, setUmkm] = useState<UmkmRingkas[]>([])
  const [umkmId, setUmkmId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [transaksi, setTransaksi] = useState<TransaksiDto[]>([])
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const opts: { penyedia_tipe?: string; penyedia_id?: string; status?: string } = {}
      if (filterStatus) opts.status = filterStatus
      if (umkmId) {
        opts.penyedia_tipe = 'umkm'
        opts.penyedia_id = umkmId
      }
      const res = await getTransaksi(desaSlug, opts)
      setTransaksi(res.item)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, filterStatus, umkmId, locale])

  useEffect(() => {
    void getUmkmKelola(desaSlug)
      .then((u) => setUmkm(u.item))
      .catch(() => setUmkm([]))
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  const totalBruto = transaksi.reduce((s, tx) => s + tx.bruto, 0)
  const totalNeto = transaksi.reduce((s, tx) => s + tx.neto_penyedia, 0)
  const totalReinvest = transaksi.reduce((s, tx) => s + tx.porsi_reinvestasi, 0)

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('desc')}</p>

      <div className="flex flex-wrap gap-3">
        <select
          value={umkmId}
          onChange={(e) => setUmkmId(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          aria-label={t('filterUmkm')}
        >
          <option value="">{t('semuaPenyedia')}</option>
          {umkm.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nama}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          aria-label={t('filterStatus')}
        >
          {STATUS_FILTER.map((s) => (
            <option key={s || 'all'} value={s}>
              {s ? tr(`status.${s}`) : t('filterSemua')}
            </option>
          ))}
        </select>
      </div>

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t('statBruto'), val: totalBruto, cls: 'text-neutral-900 dark:text-neutral-100' },
          { label: t('statNeto'), val: totalNeto, cls: 'text-primary-800 dark:text-primary-200' },
          { label: t('statReinvest'), val: totalReinvest, cls: 'text-kiluan-sea dark:text-kiluan-mint' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700 dark:bg-neutral-900/30">
            <p className="text-xs uppercase tracking-wide text-neutral-500">{s.label}</p>
            <p className={clsx('mt-1 text-lg font-bold', s.cls)}>{formatHarga(s.val, 'per_paket')}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
          <TableCellsIcon className="size-5 text-kiluan-sea dark:text-kiluan-mint" aria-hidden />
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{t('ledger')}</h3>
        </div>
        {loading ? (
          <p className="p-4 text-sm text-neutral-500">{t('loading')}</p>
        ) : transaksi.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500 dark:text-neutral-400">{t('empty')}</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {transaksi.map((tx) => (
              <li key={tx.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium capitalize text-neutral-900 dark:text-neutral-100">{tx.jenis}</span>
                    <span className={badgeStatus(tx.status)}>{tr(`status.${tx.status}`) || tx.status}</span>
                    {tx.payout_id && (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('sudahPayout')}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {t('pesanan', { id: tx.pesanan_id.slice(0, 8) })} · {tx.penyedia.tipe}
                  </p>
                  <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                    {t('bruto')} {formatHarga(tx.bruto, 'per_paket')} · {t('fee')}{' '}
                    {formatHarga(tx.fee_platform, 'per_paket')} · {t('reinvestasi')}{' '}
                    <span className="text-kiluan-sea dark:text-kiluan-mint">
                      {formatHarga(tx.porsi_reinvestasi, 'per_paket')}
                    </span>
                  </p>
                  {tx.dibuat_pada && (
                    <time className="mt-1 block text-xs text-neutral-400" dateTime={tx.dibuat_pada}>
                      {formatTanggal(tx.dibuat_pada, locale === 'en' ? 'en-US' : 'id-ID')}
                    </time>
                  )}
                </div>
                <p className="shrink-0 font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatHarga(tx.neto_penyedia, 'per_paket')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

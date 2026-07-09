'use client'

import BadgeChip from '@/components/kiluan/lencana/BadgeChip'
import PoinRingkas from '@/components/kiluan/lencana/PoinRingkas'
import {
  getBadgeSaya,
  getKatalogBadge,
  getPoinSaya,
} from '@/lib/api/lencana'
import type { BadgeItem, TransaksiPoinItem } from '@/lib/api/types'
import { deskripsiSyaratBadge, formatTanggal, labelAksiPoin } from '@/lib/kiluan/lencana'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  LockClosedIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function LencanaSayaClient({ desaSlug, desaNama }: Props) {
  const [saldo, setSaldo] = useState(0)
  const [riwayat, setRiwayat] = useState<TransaksiPoinItem[]>([])
  const [katalog, setKatalog] = useState<BadgeItem[]>([])
  const [milikIds, setMilikIds] = useState<Set<number>>(new Set())
  const [kursor, setKursor] = useState<string | null>(null)
  const [adaLagi, setAdaLagi] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const muatAwal = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [poin, badgeKatalog, badgeMilik] = await Promise.all([
        getPoinSaya(desaSlug, { batas: 10 }),
        getKatalogBadge(desaSlug),
        getBadgeSaya(desaSlug),
      ])
      setSaldo(poin.saldo)
      setRiwayat(poin.riwayat)
      setKursor(poin.meta.kursor_berikutnya)
      setAdaLagi(poin.meta.ada_lagi)
      setKatalog(badgeKatalog)
      setMilikIds(new Set(badgeMilik.map((b) => b.id)))
    } catch {
      setError('Gagal memuat data lencana. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muatAwal()
  }, [muatAwal])

  async function muatLagi() {
    if (!kursor || loadingMore) return
    setLoadingMore(true)
    try {
      const poin = await getPoinSaya(desaSlug, { kursor, batas: 10 })
      setRiwayat((prev) => [...prev, ...poin.riwayat])
      setKursor(poin.meta.kursor_berikutnya)
      setAdaLagi(poin.meta.ada_lagi)
    } finally {
      setLoadingMore(false)
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Memuat lencana…
      </div>
    )
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-primary-800 via-primary-700 to-kiluan-teal text-white dark:from-primary-950 dark:via-primary-900 dark:to-primary-800">
        <div className="container py-10 sm:py-12">
          <Link
            href={`/${desaSlug}/dasbor`}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-100 hover:text-white"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            Dasbor
          </Link>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-primary-100/90">{desaNama}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">Lencana Warga</h1>
              <p className="mt-2 max-w-lg text-sm text-primary-50/90">
                Poin dan badge dari kontribusi, produk, dan partisipasi regeneratif di desa ini.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-6 py-4 ring-1 ring-white/20 backdrop-blur-sm">
              <p className="text-xs font-medium tracking-wide text-primary-100 uppercase">Saldo poin</p>
              <p className="mt-1 text-3xl font-bold text-white">{saldo.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-10 sm:py-12">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
            <button type="button" onClick={() => void muatAwal()} className="ml-2 font-semibold underline">
              Coba lagi
            </button>
          </div>
        )}

        <section>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-primary-800 dark:text-primary-100">Koleksi badge</h2>
            <Link
              href={`/${desaSlug}/leaderboard`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              <TrophyIcon className="size-4" aria-hidden />
              Leaderboard
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {katalog.map((badge) => {
              const dimiliki = milikIds.has(badge.id)
              return (
                <div
                  key={badge.id}
                  className={clsx(
                    'rounded-2xl border p-5 transition',
                    dimiliki
                      ? 'border-kiluan-mint/40 bg-kiluan-mint/5 dark:border-kiluan-mint/20 dark:bg-kiluan-mint/5'
                      : 'border-neutral-200 bg-neutral-50/80 opacity-90 dark:border-neutral-700 dark:bg-neutral-800/40',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-3xl" aria-hidden>
                      {badge.ikon ?? '🏅'}
                    </span>
                    {!dimiliki && (
                      <LockClosedIcon className="size-5 shrink-0 text-neutral-400" aria-label="Terkunci" />
                    )}
                  </div>
                  <div className="mt-3">
                    <BadgeChip
                      nama={badge.nama}
                      ikon={null}
                      tingkat={badge.tingkat}
                      dimiliki={dimiliki}
                      size="sm"
                    />
                    {badge.deskripsi && (
                      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{badge.deskripsi}</p>
                    )}
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
                      {dimiliki ? 'Diperoleh' : `Syarat: ${deskripsiSyaratBadge(badge.syarat)}`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-primary-800 dark:text-primary-100">Riwayat poin</h2>
          {riwayat.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
              Belum ada transaksi poin. Kontribusi data atau daftarkan produk untuk mulai mengumpulkan poin.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
              {riwayat.map((item, i) => (
                <li
                  key={`${item.referensi_id ?? i}-${item.dibuat_pada}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-primary-800 dark:text-primary-100">
                      {labelAksiPoin(item.kode_aksi)}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatTanggal(item.dibuat_pada)}
                    </p>
                  </div>
                  <PoinRingkas saldo={item.poin} compact className="shrink-0 text-kiluan-sea" />
                </li>
              ))}
            </ul>
          )}
          {adaLagi && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => void muatLagi()}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-600 dark:hover:bg-neutral-800"
              >
                <ArrowPathIcon className={clsx('size-4', loadingMore && 'animate-spin')} aria-hidden />
                {loadingMore ? 'Memuat…' : 'Muat lagi'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

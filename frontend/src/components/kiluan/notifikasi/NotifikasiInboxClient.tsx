'use client'

import {
  getDaftarNotifikasi,
  tandaiNotifikasiBaca,
  tandaiSemuaNotifikasiBaca,
} from '@/lib/api/notifikasi'
import type { NotifikasiItem, StatusNotifikasi } from '@/lib/api/types'
import { formatWaktuRelatif, urlEntitasNotifikasi } from '@/lib/kiluan/notifikasi'
import {
  BanknotesIcon,
  BellIcon,
  CheckBadgeIcon,
  ShoppingBagIcon,
  TicketIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

function ikonNotifikasi(tipe: string) {
  if (tipe.includes('pembayaran') || tipe.includes('payout') || tipe.includes('refund')) {
    return BanknotesIcon
  }
  if (tipe.includes('booking') || tipe.includes('checkin')) return TicketIcon
  if (tipe.includes('stempel') || tipe.includes('poin')) return CheckBadgeIcon
  return ShoppingBagIcon
}

export default function NotifikasiInboxClient({ desaSlug, desaNama }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<StatusNotifikasi | 'semua'>('semua')
  const [item, setItem] = useState<NotifikasiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [memuatLebih, setMemuatLebih] = useState(false)
  const [adaLagi, setAdaLagi] = useState(false)
  const [kursor, setKursor] = useState<string | null>(null)

  const muat = useCallback(
    async (reset = true) => {
      if (reset) setLoading(true)
      else setMemuatLebih(true)
      try {
        const res = await getDaftarNotifikasi(desaSlug, {
          status: filter === 'semua' ? undefined : filter,
          kursor: reset ? undefined : kursor ?? undefined,
          batas: 20,
        })
        setItem((prev) => (reset ? res.item : [...prev, ...res.item]))
        setAdaLagi(res.meta.ada_lagi)
        setKursor(res.meta.kursor_berikutnya)
      } finally {
        setLoading(false)
        setMemuatLebih(false)
      }
    },
    [desaSlug, filter, kursor],
  )

  useEffect(() => {
    void muat(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desaSlug, filter])

  const klik = async (n: NotifikasiItem) => {
    if (n.status === 'belum_dibaca') {
      await tandaiNotifikasiBaca(desaSlug, n.id)
      setItem((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, status: 'dibaca', dibaca_pada: new Date().toISOString() } : x,
        ),
      )
    }
    router.push(urlEntitasNotifikasi(desaSlug, n))
  }

  const bacaSemua = async () => {
    await tandaiSemuaNotifikasiBaca(desaSlug)
    setItem((prev) =>
      prev.map((x) =>
        x.status === 'belum_dibaca'
          ? { ...x, status: 'dibaca', dibaca_pada: new Date().toISOString() }
          : x,
      ),
    )
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-kiluan-mint/30 via-primary-50 to-white dark:from-primary-950 dark:via-primary-900 dark:to-neutral-950">
        <div className="container flex flex-col gap-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:py-12">
          <div>
            <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{desaNama}</p>
            <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight text-primary-800 dark:text-primary-100">
              <BellIcon className="size-8" aria-hidden />
              Genta
            </h1>
            <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">
              Notifikasi aktivitas transaksi — pesanan, booking, payout, dan misi lestari.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void bacaSemua()}
            className="shrink-0 rounded-full border border-primary-600 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-950"
          >
            Tandai semua dibaca
          </button>
        </div>
      </div>

      <div className="container py-8 sm:py-10">
        <div className="mb-6 flex gap-1 rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
          {(['semua', 'belum_dibaca', 'dibaca'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={clsx(
                'rounded-full px-4 py-2 text-sm font-medium capitalize transition',
                filter === f
                  ? 'bg-white text-primary-800 shadow-sm dark:bg-neutral-900 dark:text-primary-100'
                  : 'text-neutral-600 hover:text-primary-700 dark:text-neutral-400',
              )}
            >
              {f === 'semua' ? 'Semua' : f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-neutral-500">Memuat notifikasi…</p>
        ) : item.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-500">Tidak ada notifikasi.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/40">
            {item.map((n) => {
              const Icon = ikonNotifikasi(n.tipe)
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void klik(n)}
                    className="flex w-full gap-4 px-4 py-4 text-left transition hover:bg-neutral-50 sm:px-5 dark:hover:bg-neutral-800/60"
                  >
                    <div
                      className={clsx(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl',
                        n.status === 'belum_dibaca'
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={clsx(
                            'text-sm',
                            n.status === 'belum_dibaca'
                              ? 'font-semibold text-neutral-900 dark:text-neutral-100'
                              : 'font-medium text-neutral-700 dark:text-neutral-300',
                          )}
                        >
                          {n.judul}
                        </p>
                        {n.status === 'belum_dibaca' && (
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-primary-500" aria-hidden />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">{n.isi}</p>
                      <p className="mt-1 text-xs text-neutral-400">{formatWaktuRelatif(n.dibuat_pada)}</p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {adaLagi && !loading && (
          <div className="mt-6 text-center">
            <button
              type="button"
              disabled={memuatLebih}
              onClick={() => void muat(false)}
              className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium dark:border-neutral-600"
            >
              {memuatLebih ? 'Memuat…' : 'Muat lebih banyak'}
            </button>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-neutral-500">
          <Link href={`/${desaSlug}`} className="text-primary-600 hover:underline dark:text-primary-400">
            Kembali ke beranda desa
          </Link>
        </p>
      </div>
    </div>
  )
}

'use client'

import { useDesaSlug } from '@/contexts/DesaKonteksProvider'
import {
  getDaftarNotifikasi,
  getHitungNotifikasi,
  tandaiNotifikasiBaca,
} from '@/lib/api/notifikasi'
import type { NotifikasiItem } from '@/lib/api/types'
import { formatWaktuRelatif, urlEntitasNotifikasi } from '@/lib/kiluan/notifikasi'
import ButtonCircle from '@/shared/ButtonCircle'
import {
  BanknotesIcon,
  BellIcon,
  CheckBadgeIcon,
  ShoppingBagIcon,
  TicketIcon,
} from '@heroicons/react/24/outline'
import { CloseButton, Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FC, useCallback, useEffect, useRef, useState } from 'react'

const POLL_MS = 60_000

function ikonNotifikasi(tipe: string) {
  if (tipe.includes('pembayaran') || tipe.includes('payout') || tipe.includes('refund')) {
    return BanknotesIcon
  }
  if (tipe.includes('booking') || tipe.includes('checkin')) return TicketIcon
  if (tipe.includes('stempel') || tipe.includes('poin')) return CheckBadgeIcon
  return ShoppingBagIcon
}

interface Props {
  className?: string
  desaSlug?: string
}

const NotifyDropdown: FC<Props> = ({ className = '', desaSlug: desaProp }) => {
  const desaKonteks = useDesaSlug()
  const desaSlug = desaProp ?? desaKonteks
  const router = useRouter()

  const [belumDibaca, setBelumDibaca] = useState(0)
  const [item, setItem] = useState<NotifikasiItem[]>([])
  const [memuat, setMemuat] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const muatHitung = useCallback(async () => {
    if (document.hidden) return
    try {
      const res = await getHitungNotifikasi(desaSlug)
      setBelumDibaca(res.belum_dibaca)
    } catch {
      /* abaikan — badge tetap 0 */
    }
  }, [desaSlug])

  const muatDaftar = useCallback(async () => {
    setMemuat(true)
    try {
      const res = await getDaftarNotifikasi(desaSlug, { batas: 8 })
      setItem(res.item)
    } finally {
      setMemuat(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muatHitung()
    intervalRef.current = setInterval(() => void muatHitung(), POLL_MS)

    const onVis = () => {
      if (!document.hidden) void muatHitung()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [muatHitung])

  const bukaDropdown = () => {
    void muatDaftar()
  }

  const klik = async (n: NotifikasiItem) => {
    if (n.status === 'belum_dibaca') {
      await tandaiNotifikasiBaca(desaSlug, n.id)
      setBelumDibaca((c) => Math.max(0, c - 1))
      setItem((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, status: 'dibaca', dibaca_pada: new Date().toISOString() } : x,
        ),
      )
    }
    router.push(urlEntitasNotifikasi(desaSlug, n))
  }

  return (
    <Popover className={className}>
      <>
        <PopoverButton
          as={ButtonCircle}
          className="relative"
          color="light"
          plain
          onClick={bukaDropdown}
          aria-label={`Notifikasi${belumDibaca ? `, ${belumDibaca} belum dibaca` : ''}`}
        >
              {belumDibaca > 0 && (
                <span className="absolute -end-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-primary-600 px-1 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-neutral-900">
                  {belumDibaca > 99 ? '99+' : belumDibaca}
                </span>
              )}
              <BellIcon className="size-6 text-neutral-700 dark:text-neutral-200" aria-hidden />
            </PopoverButton>

            <PopoverPanel
              transition
              anchor={{ to: 'bottom end', gap: 16 }}
              className="z-40 w-sm rounded-3xl shadow-lg ring-1 ring-black/5 transition duration-200 ease-in-out data-closed:translate-y-1 data-closed:opacity-0 dark:ring-white/10"
            >
              <div className="relative grid gap-1 bg-white p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between px-2">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Genta</h3>
                  <Link
                    href={`/${desaSlug}/notifikasi`}
                    className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    Lihat semua
                  </Link>
                </div>

                {memuat && item.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-neutral-500">Memuat…</p>
                ) : item.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-neutral-500">Belum ada notifikasi.</p>
                ) : (
                  item.map((n) => {
                    const Icon = ikonNotifikasi(n.tipe)
                    return (
                      <CloseButton
                        key={n.id}
                        as="button"
                        type="button"
                        onClick={() => void klik(n)}
                        className={clsx(
                          'relative flex w-full gap-3 rounded-xl p-3 text-left transition hover:bg-neutral-100 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500/50 dark:hover:bg-neutral-700/80',
                          n.status === 'belum_dibaca' && 'bg-primary-50/50 dark:bg-primary-950/30',
                        )}
                      >
                        <div
                          className={clsx(
                            'flex size-9 shrink-0 items-center justify-center rounded-lg',
                            n.status === 'belum_dibaca'
                              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/60 dark:text-primary-300'
                              : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400',
                          )}
                        >
                          <Icon className="size-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1 pe-2">
                          <p
                            className={clsx(
                              'text-sm leading-snug',
                              n.status === 'belum_dibaca'
                                ? 'font-semibold text-neutral-900 dark:text-neutral-100'
                                : 'font-medium text-neutral-700 dark:text-neutral-300',
                            )}
                          >
                            {n.judul}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                            {n.isi}
                          </p>
                          <p className="mt-1 text-xs text-neutral-400">{formatWaktuRelatif(n.dibuat_pada)}</p>
                        </div>
                        {n.status === 'belum_dibaca' && (
                          <span className="absolute end-3 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary-500" />
                        )}
                      </CloseButton>
                    )
                  })
                )}
              </div>
            </PopoverPanel>
      </>
    </Popover>
  )
}

export default NotifyDropdown

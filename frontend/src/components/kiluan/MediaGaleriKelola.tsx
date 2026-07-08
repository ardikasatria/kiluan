'use client'

import { hapusLampiran, ubahLampiran } from '@/lib/api/media'
import type { MediaItem } from '@/lib/api/types'
import {
  ArrowDownIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import { useState } from 'react'

interface Props {
  desaSlug: string
  items: MediaItem[]
  onChange: (items: MediaItem[]) => void
  className?: string
}

function urlGambar(item: MediaItem) {
  return item.url ?? ''
}

export default function MediaGaleriKelola({ desaSlug, items, onChange, className }: Props) {
  const [memuat, setMemuat] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const urut = [...items].sort((a, b) => {
    if (a.utama && !b.utama) return -1
    if (!a.utama && b.utama) return 1
    return (a.urutan ?? 0) - (b.urutan ?? 0)
  })

  const setSampul = async (item: MediaItem) => {
    if (!item.lampiran_id) return
    setMemuat(item.lampiran_id)
    setError(null)
    try {
      await ubahLampiran(desaSlug, item.lampiran_id, { utama: true })
      onChange(
        items.map((m) => ({
          ...m,
          utama: m.lampiran_id === item.lampiran_id,
        })),
      )
    } catch {
      setError('Gagal mengatur sampul.')
    } finally {
      setMemuat(null)
    }
  }

  const geser = async (idx: number, arah: -1 | 1) => {
    const target = idx + arah
    if (target < 0 || target >= urut.length) return
    const a = urut[idx]
    const b = urut[target]
    if (!a.lampiran_id || !b.lampiran_id) return
    setMemuat(a.lampiran_id)
    setError(null)
    try {
      const urutanA = b.urutan ?? target
      const urutanB = a.urutan ?? idx
      await Promise.all([
        ubahLampiran(desaSlug, a.lampiran_id, { urutan: urutanA }),
        ubahLampiran(desaSlug, b.lampiran_id, { urutan: urutanB }),
      ])
      onChange(
        items.map((m) => {
          if (m.lampiran_id === a.lampiran_id) return { ...m, urutan: urutanA }
          if (m.lampiran_id === b.lampiran_id) return { ...m, urutan: urutanB }
          return m
        }),
      )
    } catch {
      setError('Gagal mengubah urutan.')
    } finally {
      setMemuat(null)
    }
  }

  const hapus = async (item: MediaItem) => {
    if (!item.lampiran_id) return
    if (!confirm('Lepas media dari destinasi ini?')) return
    setMemuat(item.lampiran_id)
    setError(null)
    try {
      await hapusLampiran(desaSlug, item.lampiran_id)
      onChange(items.filter((m) => m.lampiran_id !== item.lampiran_id))
    } catch {
      setError('Gagal menghapus lampiran.')
    } finally {
      setMemuat(null)
    }
  }

  if (urut.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-600 dark:bg-neutral-900/20 dark:text-neutral-400">
        Belum ada foto. Unggah gambar pertama di atas.
      </p>
    )
  }

  return (
    <div className={clsx('space-y-3', className)}>
      {error && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          {error}
        </p>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {urut.map((item, idx) => {
          const busy = memuat === item.lampiran_id
          return (
            <li
              key={item.lampiran_id ?? item.id}
              className={clsx(
                'group relative overflow-hidden rounded-xl border bg-neutral-100 shadow-sm dark:bg-neutral-800/80',
                item.utama
                  ? 'border-primary-500 ring-2 ring-primary-500/25 dark:border-primary-400 dark:ring-primary-400/20'
                  : 'border-neutral-200 dark:border-neutral-700',
              )}
            >
              <div className="relative aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlGambar(item)}
                  alt={item.alt ?? 'Media destinasi'}
                  className="size-full object-cover"
                  loading="lazy"
                />
                {item.utama && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary-700/95 px-2 py-0.5 text-[10px] font-semibold text-white uppercase shadow-sm dark:bg-primary-600/95">
                    <StarSolidIcon className="size-3" aria-hidden />
                    Sampul
                  </span>
                )}
                {busy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
                    <ArrowPathIcon className="size-6 animate-spin text-white" aria-hidden />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-0.5 border-t border-neutral-200 bg-white p-1 sm:gap-1 sm:p-1.5 dark:border-neutral-700 dark:bg-neutral-900/90">
                <button
                  type="button"
                  title="Jadikan sampul"
                  disabled={busy || item.utama}
                  onClick={() => void setSampul(item)}
                  className="rounded-lg p-2 text-neutral-600 hover:bg-primary-50 hover:text-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none disabled:opacity-40 sm:p-1.5 dark:text-neutral-300 dark:hover:bg-primary-900/40 dark:hover:text-primary-300"
                >
                  {item.utama ? (
                    <StarSolidIcon className="size-4 text-primary-600 dark:text-primary-400" />
                  ) : (
                    <StarIcon className="size-4" aria-hidden />
                  )}
                </button>
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    title="Geser kiri"
                    disabled={busy || idx === 0}
                    onClick={() => void geser(idx, -1)}
                    className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none disabled:opacity-30 sm:p-1.5 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  >
                    <ArrowUpIcon className="size-4 rotate-[-90deg]" aria-hidden />
                  </button>
                  <button
                    type="button"
                    title="Geser kanan"
                    disabled={busy || idx === urut.length - 1}
                    onClick={() => void geser(idx, 1)}
                    className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none disabled:opacity-30 sm:p-1.5 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  >
                    <ArrowDownIcon className="size-4 rotate-[-90deg]" aria-hidden />
                  </button>
                </div>
                <button
                  type="button"
                  title="Hapus"
                  disabled={busy}
                  onClick={() => void hapus(item)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none sm:p-1.5 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  <TrashIcon className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

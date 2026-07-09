'use client'

import { formatHarga, labelStatusPaket, warnaStatusPaket } from '@/lib/kiluan/pasar'
import { getDaftarPaket, transisiPaket } from '@/lib/api/pasar'
import type { PaketRingkas } from '@/lib/api/types'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function KurasiPaketClient({ desaSlug, desaNama }: Props) {
  const [antrean, setAntrean] = useState<PaketRingkas[]>([])
  const [catatan, setCatatan] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getDaftarPaket(desaSlug, { kelola: true, status: 'review' })
      setAntrean(res.item.filter((p) => p.status === 'review'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  async function keputusan(paketId: string, aksi: 'setuju' | 'tolak' | 'minta_revisi') {
    await transisiPaket(desaSlug, paketId, aksi, catatan[paketId] ?? '')
    void muat()
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container py-8">
          <Link href={`/${desaSlug}/kelola`} className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline">
            <ArrowLeftIcon className="size-4" /> Kelola desa
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-primary-800 dark:text-primary-100">Kurasi Paket Wisata</h1>
          <p className="text-sm text-neutral-500">{desaNama}</p>
        </div>
      </div>

      <div className="container py-8">
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat antrean…</p>
        ) : antrean.length === 0 ? (
          <p className="text-sm text-neutral-500">Tidak ada paket menunggu kurasi.</p>
        ) : (
          <ul className="space-y-4">
            {antrean.map((p) => (
              <li key={p.id} className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-primary-800 dark:text-primary-100">{p.nama}</h3>
                    <p className="text-sm text-neutral-500">
                      {p.agen.nama} · {formatHarga(p.harga, p.satuan_harga)} · {p.durasi_jam} jam
                    </p>
                  </div>
                  <span className={clsx('rounded-full px-2 py-0.5 text-xs ring-1', warnaStatusPaket(p.status))}>
                    {labelStatusPaket(p.status)}
                  </span>
                </div>
                <textarea
                  placeholder="Catatan kurator (opsional)"
                  value={catatan[p.id] ?? ''}
                  onChange={(e) => setCatatan((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  className="mt-3 w-full rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                  rows={2}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void keputusan(p.id, 'setuju')}
                    className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white"
                  >
                    Setujui & publikasi
                  </button>
                  <button
                    type="button"
                    onClick={() => void keputusan(p.id, 'minta_revisi')}
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600"
                  >
                    Minta revisi
                  </button>
                  <button
                    type="button"
                    onClick={() => void keputusan(p.id, 'tolak')}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700"
                  >
                    Tolak
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

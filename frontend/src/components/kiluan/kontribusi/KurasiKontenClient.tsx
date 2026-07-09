'use client'

import { getAntreanKurasi, transisiKontribusi } from '@/lib/api/kontribusi'
import type { KontribusiItem } from '@/lib/api/types'
import {
  labelTipeKontribusi,
  perluTombolTerapkan,
  ringkasanMuatan,
  urlTerapkan,
} from '@/lib/kiluan/kontribusi'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function KurasiKontenClient({ desaSlug, desaNama }: Props) {
  const [tab, setTab] = useState<'menunggu' | 'terapkan'>('menunggu')
  const [antrean, setAntrean] = useState<KontribusiItem[]>([])
  const [disetujui, setDisetujui] = useState<KontribusiItem[]>([])
  const [catatan, setCatatan] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const [menunggu, ok] = await Promise.all([
        getAntreanKurasi(desaSlug),
        getAntreanKurasi(desaSlug, { status: 'disetujui' }),
      ])
      setAntrean(menunggu.item)
      setDisetujui(
        ok.item.filter((k) => k.tipe === 'koreksi_data' || k.tipe === 'spot_baru'),
      )
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  async function keputusan(id: string, aksi: 'setuju' | 'tolak' | 'minta_revisi') {
    await transisiKontribusi(desaSlug, id, aksi, catatan[id] ?? '')
    void muat()
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container py-8">
          <Link href={`/${desaSlug}/kelola`} className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline">
            <ArrowLeftIcon className="size-4" /> Kelola desa
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-primary-800 dark:text-primary-100">Antrean Kurasi Konten</h1>
          <p className="text-sm text-neutral-500">{desaNama}</p>
        </div>
      </div>

      <div className="container py-8">
        <div className="mb-6 flex gap-2">
          {(['menunggu', 'terapkan'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={clsx(
                'rounded-full px-4 py-2 text-sm font-medium',
                tab === t ? 'bg-primary-700 text-white' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800',
              )}
            >
              {t === 'menunggu' ? 'Menunggu kurasi' : 'Saran terapkan'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-neutral-500">Memuat…</p>
        ) : tab === 'menunggu' ? (
          antrean.length === 0 ? (
            <p className="text-sm text-neutral-500">Tidak ada kontribusi menunggu.</p>
          ) : (
            <ul className="space-y-4">
              {antrean.map((k) => (
                <li key={k.id} className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
                  <p className="font-semibold text-primary-800 dark:text-primary-100">
                    {labelTipeKontribusi(k.tipe)} · {k.target_tipe}
                  </p>
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{ringkasanMuatan(k)}</p>
                  <textarea
                    placeholder="Catatan kurator"
                    value={catatan[k.id] ?? ''}
                    onChange={(e) => setCatatan((p) => ({ ...p, [k.id]: e.target.value }))}
                    className="mt-3 w-full rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                    rows={2}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void keputusan(k.id, 'setuju')}
                      className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white"
                    >
                      Setujui
                    </button>
                    <button
                      type="button"
                      onClick={() => void keputusan(k.id, 'minta_revisi')}
                      className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600"
                    >
                      Minta revisi
                    </button>
                    <button
                      type="button"
                      onClick={() => void keputusan(k.id, 'tolak')}
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700"
                    >
                      Tolak
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : disetujui.length === 0 ? (
          <p className="text-sm text-neutral-500">Tidak ada saran menunggu penerapan.</p>
        ) : (
          <ul className="space-y-4">
            {disetujui.map((k) => (
              <li key={k.id} className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
                <p className="font-semibold text-primary-800 dark:text-primary-100">
                  {labelTipeKontribusi(k.tipe)}
                </p>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{ringkasanMuatan(k)}</p>
                <div className="mt-3">
                  <TerapkanSaran desaSlug={desaSlug} item={k} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 text-xs text-neutral-500">
          Koreksi & spot baru yang disetujui tidak otomatis mengubah destinasi — gunakan Terapkan untuk membuka editor destinasi.
        </p>
      </div>
    </div>
  )
}

// Disetujui koreksi/spot — tampilkan di halaman terpisah atau extend antrean status=disetujui
export function TerapkanSaran({ desaSlug, item }: { desaSlug: string; item: KontribusiItem }) {
  if (!perluTombolTerapkan(item)) return null
  const url = urlTerapkan(desaSlug, item)
  if (!url) return null
  return (
    <Link href={url} className="text-sm font-medium text-primary-600 hover:underline">
      Terapkan di editor destinasi →
    </Link>
  )
}

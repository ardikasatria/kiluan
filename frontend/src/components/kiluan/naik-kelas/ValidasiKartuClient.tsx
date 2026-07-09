'use client'

import { getAntreanValidasi, transisiPengajuan } from '@/lib/api/naik-kelas'
import type { PengajuanKartuItem } from '@/lib/api/types'
import { labelStatusPengajuan } from '@/lib/kiluan/naik-kelas'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function ValidasiKartuClient({ desaSlug, desaNama }: Props) {
  const [antrean, setAntrean] = useState<PengajuanKartuItem[]>([])
  const [catatan, setCatatan] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAntreanValidasi(desaSlug)
      setAntrean(res.item)
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  async function keputusan(id: string, aksi: 'setuju' | 'tolak' | 'minta_revisi') {
    await transisiPengajuan(desaSlug, id, aksi, catatan[id] ?? '')
    void muat()
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container py-8">
          <Link href={`/${desaSlug}/kelola`} className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline">
            <ArrowLeftIcon className="size-4" /> Kelola desa
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-primary-800 dark:text-primary-100">Validasi Kartu Aksi</h1>
          <p className="text-sm text-neutral-500">{desaNama}</p>
        </div>
      </div>

      <div className="container py-8">
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat antrean…</p>
        ) : antrean.length === 0 ? (
          <p className="text-sm text-neutral-500">Tidak ada pengajuan menunggu.</p>
        ) : (
          <ul className="space-y-4">
            {antrean.map((p) => (
              <li key={p.id} className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
                <p className="font-semibold text-primary-800 dark:text-primary-100">
                  {p.kartu.nama} · {p.subjek_tipe}
                </p>
                <p className="mt-1 text-xs text-neutral-500">{labelStatusPengajuan(p.status)}</p>
                {typeof p.bukti.pernyataan === 'string' && p.bukti.pernyataan && (
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {p.bukti.pernyataan}
                  </p>
                )}
                <textarea
                  placeholder="Catatan validator"
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
                    Validasi
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
        <p className="mt-8 text-xs text-neutral-500">
          Validasi menaikkan skor & tingkat sertifikasi owner — memengaruhi urutan di Pasar Desa.
        </p>
      </div>
    </div>
  )
}

'use client'

import { getStasiun } from '@/lib/api/penjelajah'
import type { StasiunLestariDto } from '@/lib/api/types'
import { MapPinIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function StasiunClient({ desaSlug, desaNama }: Props) {
  const [stasiun, setStasiun] = useState<StasiunLestariDto[]>([])
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getStasiun(desaSlug)
      setStasiun(res.item)
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-sky-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <p className="text-sm text-primary-600">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">
            Stasiun Lestari
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Titik check-in QR + geofence untuk misi aksi.
          </p>
        </div>
      </div>

      <div className="container py-10">
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat stasiun…</p>
        ) : stasiun.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada stasiun terdaftar.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {stasiun.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700"
              >
                <div className="flex items-center gap-2 font-medium">
                  <MapPinIcon className="size-5 text-primary-500" />
                  {s.nama}
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  {s.tipe} · radius {s.radius_m} m
                </p>
                {s.lokasi && (
                  <p className="mt-1 text-xs text-neutral-400">
                    {s.lokasi.lat.toFixed(5)}, {s.lokasi.lng.toFixed(5)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        <Link
          href={`/${desaSlug}/misi`}
          className="mt-8 inline-block text-sm text-primary-600 hover:underline"
        >
          ← Kembali ke Misi sigerciv
        </Link>
      </div>
    </div>
  )
}

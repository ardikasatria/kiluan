'use client'

import { getPasporSaya } from '@/lib/api/penjelajah'
import type { PasporDto } from '@/lib/api/types'
import { CheckBadgeIcon, SparklesIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

function teksDampak(ringkas: Record<string, number>) {
  const parts = Object.entries(ringkas).map(([k, v]) => {
    if (k === 'mangrove') return `tanam ${v} mangrove`
    if (k === 'sampah') return `kumpul ${v} kg sampah`
    return `${k}: ${v}`
  })
  if (!parts.length) return 'Belum ada dampak tercatat.'
  return `Kamu bantu ${parts.join(', ')}.`
}

export default function PasporClient({ desaSlug, desaNama }: Props) {
  const [paspor, setPaspor] = useState<PasporDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const p = await getPasporSaya(desaSlug)
      setPaspor(p)
    } catch {
      setGalat('Masuk untuk melihat Paspor Lestari Anda.')
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-teal-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <p className="text-sm text-primary-600">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">
            Paspor Lestari
          </h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">
            Hanya stempel terverifikasi yang masuk paspor — aksi tercatat, bukan klaim dampak
            terbukti (validasi ekologis di Fase 3).
          </p>
        </div>
      </div>

      <div className="container py-10">
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat paspor…</p>
        ) : galat ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm dark:border-amber-900 dark:bg-amber-950/30">
            <p>{galat}</p>
            <Link href="/masuk" className="mt-2 inline-block text-primary-600 hover:underline">
              Masuk →
            </Link>
          </div>
        ) : paspor ? (
          <>
            <div className="rounded-2xl border border-primary-200 bg-white p-6 shadow-sm dark:border-primary-800 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <SparklesIcon className="size-8 text-primary-500" />
                <div>
                  <p className="text-2xl font-bold">{paspor.total_stempel} stempel</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {teksDampak(paspor.ringkasan_dampak)}
                  </p>
                </div>
              </div>
            </div>

            <h2 className="mb-4 mt-10 text-lg font-semibold">Stempel terverifikasi</h2>
            {paspor.stempel.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Belum ada stempel.{' '}
                <Link href={`/${desaSlug}/misi`} className="text-primary-600 hover:underline">
                  Mulai misi →
                </Link>
              </p>
            ) : (
              <ul className="space-y-3">
                {paspor.stempel.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700"
                  >
                    <CheckBadgeIcon className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-medium">{s.misi?.judul ?? 'Misi'}</p>
                      <p className="text-xs text-neutral-500">
                        {new Date(s.dibuat_pada).toLocaleDateString('id-ID')}
                      </p>
                      {Object.keys(s.dampak).length > 0 && (
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                          {teksDampak(s.dampak)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

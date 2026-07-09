'use client'

import { getVerifikasiAntrean, putuskanVerifikasi } from '@/lib/api/penjelajah'
import type { VerifikasiDto } from '@/lib/api/types'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

export default function VerifikatorClient({ desaSlug }: Props) {
  const [antrean, setAntrean] = useState<VerifikasiDto[]>([])
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)
  const [prosesId, setProsesId] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getVerifikasiAntrean(desaSlug, {
        entitas_tipe: 'stempel',
        hasil: 'menunggu',
      })
      setAntrean(res.item)
      setGalat(null)
    } catch {
      setGalat('Tidak dapat memuat antrean — pastikan Anda berperan verifikator.')
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  async function putuskan(id: string, hasil: 'valid' | 'invalid') {
    setProsesId(id)
    try {
      await putuskanVerifikasi(desaSlug, id, hasil)
      await muat()
    } catch {
      setGalat('Gagal memutuskan verifikasi.')
    } finally {
      setProsesId(null)
    }
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-sm text-neutral-500">Memuat antrean…</p>
      ) : galat ? (
        <p className="text-sm text-red-600">{galat}</p>
      ) : antrean.length === 0 ? (
        <p className="text-sm text-neutral-500">Tidak ada verifikasi menunggu.</p>
      ) : (
        <ul className="space-y-3">
          {antrean.map((v) => (
            <li
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700"
            >
              <div>
                <p className="font-medium">Stempel · {v.metode}</p>
                <p className="text-xs text-neutral-500">
                  {new Date(v.dibuat_pada).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={prosesId === v.id}
                  onClick={() => void putuskan(v.id, 'invalid')}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700"
                >
                  Tolak
                </button>
                <button
                  type="button"
                  disabled={prosesId === v.id}
                  onClick={() => void putuskan(v.id, 'valid')}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white"
                >
                  Valid
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

'use client'

import { getRefund, transisiRefund } from '@/lib/api/uang'
import type { RefundDto } from '@/lib/api/types'
import { formatHarga } from '@/lib/kiluan/pasar'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

const AKSI: Record<string, Array<'setuju' | 'tolak' | 'proses' | 'selesai'>> = {
  diajukan: ['setuju', 'tolak'],
  disetujui: ['proses'],
  diproses: ['selesai'],
}

export default function RefundKelolaClient({ desaSlug }: Props) {
  const [refund, setRefund] = useState<RefundDto[]>([])
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const r = await getRefund(desaSlug)
      setRefund(r.item)
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  async function transisi(id: string, aksi: 'setuju' | 'tolak' | 'proses' | 'selesai') {
    await transisiRefund(desaSlug, id, aksi)
    await muat()
  }

  if (loading) return <p className="text-sm text-neutral-500">Memuat refund…</p>

  return (
    <div>
      <h2 className="text-lg font-semibold">Pengajuan refund</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Refund setelah pesanan selesai ditolak otomatis — jalur manual bendahara.
      </p>
      {refund.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">Tidak ada pengajuan.</p>
      ) : (
        <ul className="mt-4 divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700">
          {refund.map((r) => (
            <li key={r.id} className="p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium">{formatHarga(r.jumlah, 'per_paket')}</p>
                  <p className="text-xs text-neutral-500">Pesanan {r.pesanan_id.slice(0, 8)}…</p>
                  <p className="mt-1 text-sm">{r.alasan}</p>
                </div>
                <span className="h-fit rounded-full bg-neutral-100 px-2 py-0.5 text-xs capitalize dark:bg-neutral-800">
                  {r.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(AKSI[r.status] ?? []).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => void transisi(r.id, a)}
                    className="rounded-full border border-primary-300 px-3 py-1 text-xs font-medium capitalize hover:bg-primary-50"
                  >
                    {a}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

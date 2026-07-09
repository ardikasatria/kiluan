'use client'

import { getKuponSaya } from '@/lib/api/poin'
import type { KuponRingkas } from '@/lib/api/types'
import { TicketIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

function badgeSumber(sumber: string) {
  if (sumber === 'tukar_poin') return 'Dari tukar poin'
  if (sumber === 'promo_owner') return 'Diskon UMKM bersertifikat'
  if (sumber === 'kampanye') return 'Kampanye desa'
  return sumber
}

export default function KuponDompetClient({ desaSlug, desaNama }: Props) {
  const [kupon, setKupon] = useState<KuponRingkas[]>([])
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const r = await getKuponSaya(desaSlug)
      setKupon(r.item.filter((k) => k.status === 'aktif'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  return (
    <div className="pb-16">
      <div className="container py-10">
        <p className="text-sm text-primary-600">{desaNama}</p>
        <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">Dompet Kupon</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Pakai kode saat checkout.{' '}
          <Link href={`/${desaSlug}/tukar-poin`} className="text-primary-600 hover:underline">
            Tukar poin →
          </Link>
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-neutral-500">Memuat…</p>
        ) : kupon.length === 0 ? (
          <p className="mt-8 text-sm text-neutral-500">Belum ada kupon aktif.</p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {kupon.map((k) => (
              <li
                key={k.id}
                className="rounded-2xl border border-dashed border-primary-300 bg-primary-50/50 p-5 dark:border-primary-700 dark:bg-primary-950/30"
              >
                <div className="flex items-start gap-3">
                  <TicketIcon className="size-6 shrink-0 text-primary-600" />
                  <div>
                    <p className="font-mono text-lg font-bold tracking-wide">{k.kode}</p>
                    <p className="mt-1 text-sm">
                      {k.tipe_diskon === 'persen'
                        ? `${k.nilai}% off`
                        : `Rp ${k.nilai.toLocaleString('id-ID')} off`}
                    </p>
                    <span className="mt-2 inline-block rounded-full bg-white px-2 py-0.5 text-xs dark:bg-neutral-800">
                      {badgeSumber(k.sumber)}
                    </span>
                    {k.min_belanja != null && k.min_belanja > 0 && (
                      <p className="mt-2 text-xs text-neutral-500">
                        Min. belanja Rp {k.min_belanja.toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

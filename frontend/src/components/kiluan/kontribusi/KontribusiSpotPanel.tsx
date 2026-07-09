'use client'

import KontribusiForm from '@/components/kiluan/kontribusi/KontribusiForm'
import { useAuth } from '@/contexts/AuthProvider'
import Link from 'next/link'
import { useState } from 'react'

interface Props {
  desaSlug: string
  destinasiId: string
  destinasiNama: string
}

export default function KontribusiSpotPanel({ desaSlug, destinasiId, destinasiNama }: Props) {
  const { isLoggedIn } = useAuth()
  const [buka, setBuka] = useState(false)
  const [selesai, setSelesai] = useState(false)

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Kontribusi komunitas</h3>
        <p className="mt-2 text-sm text-neutral-500">
          <Link href="/masuk" className="font-medium text-primary-600 hover:underline">
            Masuk
          </Link>{' '}
          untuk mengirim foto, tips, atau koreksi data spot ini.
        </p>
      </div>
    )
  }

  if (selesai) {
    return (
      <div className="rounded-2xl border border-kiluan-mint/40 bg-kiluan-mint/10 p-4">
        <p className="text-sm font-medium text-primary-800">Terima kasih! Kontribusi menunggu kurasi.</p>
        <Link href={`/${desaSlug}/kontribusi`} className="mt-2 inline-block text-sm text-primary-600 hover:underline">
          Lihat riwayat saya
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Kontribusi untuk spot ini</h3>
      {!buka ? (
        <button
          type="button"
          onClick={() => setBuka(true)}
          className="mt-3 rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          Kirim foto / tips / koreksi
        </button>
      ) : (
        <KontribusiForm
          desaSlug={desaSlug}
          target={{ target_tipe: 'destinasi', target_id: destinasiId, label: destinasiNama }}
          onBerhasil={() => {
            setBuka(false)
            setSelesai(true)
          }}
          className="mt-4 border-0 p-0"
        />
      )}
    </div>
  )
}

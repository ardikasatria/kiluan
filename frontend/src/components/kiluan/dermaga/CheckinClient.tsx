'use client'

import { checkinBooking } from '@/lib/api/dermaga'
import { QrCodeIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

interface Props {
  desaSlug: string
}

export default function CheckinClient({ desaSlug }: Props) {
  const [kode, setKode] = useState('')
  const [hasil, setHasil] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!kode.trim()) return
    setLoading(true)
    setGalat(null)
    setHasil(null)
    try {
      const bk = await checkinBooking(desaSlug, kode.trim())
      setHasil(`Check-in berhasil: ${bk.kode_checkin} → ${bk.status}`)
      setKode('')
    } catch {
      setGalat('Check-in gagal. Pastikan kode valid & booking terkonfirmasi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-md py-10">
      <div className="flex items-center gap-2">
        <QrCodeIcon className="size-6 text-primary-600" />
        <h1 className="text-xl font-bold text-primary-800 dark:text-primary-100">Scanner check-in</h1>
      </div>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Masukkan atau pindai kode QR tiket wisatawan. Hanya petugas/agen berwenang.
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
        <input
          value={kode}
          onChange={(e) => setKode(e.target.value)}
          placeholder="CI-XXXXXX atau booking ID"
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 font-mono text-sm dark:border-neutral-600 dark:bg-neutral-900"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-primary-700 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Memproses…' : 'Check-in'}
        </button>
      </form>
      {hasil && <p className="mt-4 text-sm text-green-700 dark:text-green-400">{hasil}</p>}
      {galat && <p className="mt-4 text-sm text-red-600">{galat}</p>}
    </div>
  )
}

'use client'

import VerifikasiKodeForm from '@/components/auth/VerifikasiKodeForm'
import Logo from '@/shared/Logo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function VerifikasiEmailClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [tahapKode, setTahapKode] = useState(false)

  return (
    <div className="container pb-16">
      <div className="my-12 flex justify-center">
        <Logo size="h-12 w-auto sm:h-14" />
      </div>
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-primary-800 dark:text-primary-100">Verifikasi Email</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Masukkan kode 6 digit yang dikirim ke email Anda.
          </p>
        </div>

        {tahapKode ? (
          <VerifikasiKodeForm
            email={email.trim().toLowerCase()}
            onBerhasil={() => router.push('/masuk')}
          />
        ) : (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Email terdaftar
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                required
              />
            </label>
            <button
              type="button"
              onClick={() => setTahapKode(true)}
              disabled={!email.trim()}
              className="w-full rounded-full bg-primary-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              Lanjut ke kode verifikasi
            </button>
          </div>
        )}

        <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
          <Link href="/masuk" className="font-medium text-primary-700 underline">
            Kembali ke halaman masuk
          </Link>
        </p>
      </div>
    </div>
  )
}

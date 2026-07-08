'use client'

import { pesanGalat } from '@/contexts/AuthProvider'
import { verifikasiEmail } from '@/lib/api/auth'
import Logo from '@/shared/Logo'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function VerifikasiEmailClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [pesan, setPesan] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setPesan('Token verifikasi tidak ditemukan.')
      return
    }
    verifikasiEmail(token)
      .then((res) => {
        setStatus('ok')
        setPesan(`Email terverifikasi. Status akun: ${res.status}`)
      })
      .catch((err) => {
        setStatus('error')
        setPesan(pesanGalat(err))
      })
  }, [token])

  return (
    <div className="container pb-16">
      <div className="my-12 flex justify-center">
        <Logo size="h-12 w-auto sm:h-14" />
      </div>
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold text-primary-800 dark:text-primary-100">Verifikasi Email</h1>
        {status === 'loading' && <p className="text-sm text-neutral-500">Memverifikasi…</p>}
        {status !== 'loading' && (
          <p
            className={`rounded-xl px-4 py-3 text-sm ${
              status === 'ok'
                ? 'bg-primary-50 text-primary-900 dark:bg-primary-900/30 dark:text-primary-100'
                : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200'
            }`}
          >
            {pesan}
          </p>
        )}
        <Link href="/masuk" className="inline-block text-sm font-medium text-primary-700 underline">
          Ke halaman masuk
        </Link>
      </div>
    </div>
  )
}

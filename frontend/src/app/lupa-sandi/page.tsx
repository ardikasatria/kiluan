'use client'

import { pesanGalat } from '@/contexts/AuthProvider'
import { apiFetch } from '@/lib/api/client'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Logo from '@/shared/Logo'
import Link from 'next/link'
import { FormEvent, useState } from 'react'

export default function LupaSandiPage() {
  const [email, setEmail] = useState('')
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setGalat(null)
    setPesan(null)
    setMemuat(true)
    try {
      const res = await apiFetch<{ pesan: string }>('/api/v1/auth/lupa-sandi', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        auth: false,
      })
      setPesan(res.pesan)
    } catch (err) {
      setGalat(pesanGalat(err))
    } finally {
      setMemuat(false)
    }
  }

  return (
    <div className="container pb-16">
      <div className="my-12 flex justify-center">
        <Logo size="h-12 w-auto sm:h-14" />
      </div>
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-center text-xl font-semibold text-primary-800 dark:text-primary-100">Lupa kata sandi</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" required />
          </Field>
          {pesan && <p className="text-sm text-primary-800 dark:text-primary-200">{pesan}</p>}
          {galat && <p className="text-sm text-red-700 dark:text-red-300">{galat}</p>}
          <ButtonPrimary type="submit" disabled={memuat}>
            {memuat ? 'Mengirim…' : 'Kirim tautan reset'}
          </ButtonPrimary>
        </form>
        <p className="text-center text-sm">
          <Link href="/masuk" className="text-primary-700 underline">
            Kembali masuk
          </Link>
        </p>
      </div>
    </div>
  )
}

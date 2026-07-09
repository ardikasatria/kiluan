'use client'

import { pesanGalat, useAuth } from '@/contexts/AuthProvider'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Logo from '@/shared/Logo'
import PasswordInput from '@/shared/PasswordInput'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useState } from 'react'

export default function MasukForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/teluk-kiluan'
  const { masuk } = useAuth()
  const [email, setEmail] = useState('')
  const [sandi, setSandi] = useState('')
  const [galat, setGalat] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setGalat(null)
    setMemuat(true)
    try {
      await masuk({ email: email.trim().toLowerCase(), kata_sandi: sandi })
      router.push(redirect)
      router.refresh()
    } catch (err) {
      setGalat(pesanGalat(err))
    } finally {
      setMemuat(false)
    }
  }

  return (
    <div className="container pb-16">
      <div className="my-12 flex justify-center sm:my-16">
        <Logo size="h-12 w-auto sm:h-14" />
      </div>

      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-primary-800 dark:text-primary-100">Masuk ke sigerciv</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Gunakan akun yang sudah terdaftar dan diverifikasi.
          </p>
        </div>

        <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit}>
          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              autoComplete="email"
              required
            />
          </Field>
          <Field className="block">
            <div className="flex items-center justify-between text-neutral-800 dark:text-neutral-200">
              <Label>Kata sandi</Label>
              <Link href="/lupa-sandi" className="text-sm font-medium text-primary-700 underline">
                Lupa sandi?
              </Link>
            </div>
            <PasswordInput
              value={sandi}
              onChange={(e) => setSandi(e.target.value)}
              className="mt-1"
              autoComplete="current-password"
              required
            />
          </Field>
          {galat && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
              {galat}
            </p>
          )}
          <ButtonPrimary type="submit" disabled={memuat}>
            {memuat ? 'Memproses…' : 'Masuk'}
          </ButtonPrimary>
        </form>

        <div className="block text-center text-sm text-neutral-700 dark:text-neutral-300">
          Belum punya akun?{' '}
          <Link href="/daftar" className="font-medium text-primary-700 underline">
            Daftar sekarang
          </Link>
        </div>
      </div>
    </div>
  )
}

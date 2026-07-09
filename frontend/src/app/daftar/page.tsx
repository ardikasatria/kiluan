'use client'

import { pesanGalat, useAuth } from '@/contexts/AuthProvider'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Logo from '@/shared/Logo'
import Link from 'next/link'
import { FormEvent, useState } from 'react'

export default function DaftarPage() {
  const { daftar } = useAuth()
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [sandi, setSandi] = useState('')
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setGalat(null)
    setSukses(null)
    setMemuat(true)
    try {
      const pesan = await daftar({
        nama: nama.trim(),
        email: email.trim().toLowerCase(),
        kata_sandi: sandi,
      })
      setSukses(pesan)
    } catch (err) {
      setGalat(pesanGalat(err))
    } finally {
      setMemuat(false)
    }
  }

  return (
    <div className="container pb-16">
      <div className="my-12 flex justify-center sm:my-16">
        <Logo />
      </div>

      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-primary-800 dark:text-primary-100">Daftar sigerciv</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Bergabung sebagai wisatawan, kontributor, atau pelaku UMKM lokal.
          </p>
        </div>

        {sukses ? (
          <div className="space-y-4 rounded-2xl border border-primary-200 bg-primary-50 p-6 text-center dark:border-primary-700 dark:bg-primary-900/30">
            <p className="text-sm text-primary-900 dark:text-primary-100">{sukses}</p>
            <Link href="/masuk" className="inline-block font-medium text-primary-700 underline dark:text-primary-300">
              Lanjut ke halaman masuk
            </Link>
          </div>
        ) : (
          <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit}>
            <Field className="block">
              <Label className="text-neutral-800 dark:text-neutral-200">Nama lengkap</Label>
              <Input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama Anda"
                className="mt-1"
                required
              />
            </Field>
            <Field className="block">
              <Label className="text-neutral-800 dark:text-neutral-200">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="mt-1"
                required
              />
            </Field>
            <Field className="block">
              <Label className="text-neutral-800 dark:text-neutral-200">Kata sandi</Label>
              <Input
                type="password"
                value={sandi}
                onChange={(e) => setSandi(e.target.value)}
                className="mt-1"
                minLength={8}
                required
              />
              <p className="mt-1 text-xs text-neutral-500">Minimal 8 karakter</p>
            </Field>
            {galat && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
                {galat}
              </p>
            )}
            <ButtonPrimary type="submit" disabled={memuat}>
              {memuat ? 'Mendaftar…' : 'Buat akun'}
            </ButtonPrimary>
          </form>
        )}

        <div className="block text-center text-sm text-neutral-700 dark:text-neutral-300">
          Sudah punya akun?{' '}
          <Link href="/masuk" className="font-medium text-primary-700 underline">
            Masuk
          </Link>
        </div>
      </div>
    </div>
  )
}

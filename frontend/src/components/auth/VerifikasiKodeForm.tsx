'use client'

import { pesanGalat } from '@/contexts/AuthProvider'
import { kirimUlangVerifikasi, verifikasiEmail } from '@/lib/api/auth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { FormEvent, useState } from 'react'

interface Props {
  email: string
  onBerhasil?: () => void | Promise<void>
  judul?: string
  deskripsi?: string
}

export default function VerifikasiKodeForm({
  email,
  onBerhasil,
  judul = 'Verifikasi email',
  deskripsi = 'Masukkan kode 6 digit yang dikirim ke email Anda.',
}: Props) {
  const [kode, setKode] = useState('')
  const [galat, setGalat] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(false)
  const [kirimUlang, setKirimUlang] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setGalat(null)
    setInfo(null)
    setMemuat(true)
    try {
      await verifikasiEmail(email, kode.trim())
      if (onBerhasil) {
        await onBerhasil()
      }
    } catch (err) {
      setGalat(pesanGalat(err))
    } finally {
      setMemuat(false)
    }
  }

  const handleKirimUlang = async () => {
    setGalat(null)
    setInfo(null)
    setKirimUlang(true)
    try {
      const res = await kirimUlangVerifikasi(email)
      setInfo(res.pesan)
    } catch (err) {
      setGalat(pesanGalat(err))
    } finally {
      setKirimUlang(false)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-primary-200 bg-primary-50 p-6 dark:border-primary-700 dark:bg-primary-900/30">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-100">{judul}</h2>
        <p className="mt-1 text-sm text-primary-800/80 dark:text-primary-200/80">{deskripsi}</p>
        <p className="mt-2 text-sm font-medium text-primary-900 dark:text-primary-100">{email}</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field className="block">
          <Label className="text-neutral-800 dark:text-neutral-200">Kode verifikasi</Label>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={kode}
            onChange={(e) => setKode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="mt-1 text-center text-lg tracking-[0.35em]"
            autoComplete="one-time-code"
            required
          />
        </Field>

        {galat && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
            {galat}
          </p>
        )}
        {info && (
          <p className="rounded-lg bg-white/70 px-4 py-3 text-sm text-primary-900 dark:bg-neutral-900/50 dark:text-primary-100">
            {info}
          </p>
        )}

        <ButtonPrimary type="submit" disabled={memuat || kode.length !== 6} className="w-full">
          {memuat ? 'Memverifikasi…' : 'Verifikasi'}
        </ButtonPrimary>
      </form>

      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        Tidak menerima kode?{' '}
        <button
          type="button"
          onClick={handleKirimUlang}
          disabled={kirimUlang}
          className="font-medium text-primary-700 underline disabled:opacity-60 dark:text-primary-300"
        >
          {kirimUlang ? 'Mengirim…' : 'Kirim ulang'}
        </button>
      </p>
    </div>
  )
}

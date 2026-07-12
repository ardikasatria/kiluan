'use client'

import VerifikasiKodeForm from '@/components/auth/VerifikasiKodeForm'
import AuthPageShell from '@/components/layout/AuthPageShell'
import { useAuth } from '@/contexts/AuthProvider'
import { usePesanGalat } from '@/hooks/usePesanGalat'
import { Link, useRouter } from '@/i18n/navigation'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import PasswordInput from '@/shared/PasswordInput'
import { useLocale, useTranslations } from 'next-intl'
import type { Locale } from '@/i18n/routing'
import { FormEvent, useState } from 'react'

export default function DaftarPage() {
  const router = useRouter()
  const locale = useLocale() as Locale
  const { daftar, masuk } = useAuth()
  const pesanGalat = usePesanGalat()
  const t = useTranslations('auth.daftarPage')
  const tFields = useTranslations('auth.fields')
  const tErrors = useTranslations('auth.errors')
  const tAuth = useTranslations('auth')
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [sandi, setSandi] = useState('')
  const [konfirmasiSandi, setKonfirmasiSandi] = useState('')
  const [galat, setGalat] = useState<string | null>(null)
  const [pesanDaftar, setPesanDaftar] = useState<string | null>(null)
  const [tahapVerifikasi, setTahapVerifikasi] = useState(false)
  const [memuat, setMemuat] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setGalat(null)
    setPesanDaftar(null)
    if (sandi !== konfirmasiSandi) {
      setGalat(tErrors('passwordMismatch'))
      return
    }
    setMemuat(true)
    try {
      const pesan = await daftar({
        nama: nama.trim(),
        email: email.trim().toLowerCase(),
        kata_sandi: sandi,
      })
      setPesanDaftar(locale === 'en' ? t('verifyDescription') : pesan)
      setTahapVerifikasi(true)
    } catch (err) {
      setGalat(pesanGalat(err))
    } finally {
      setMemuat(false)
    }
  }

  const handleVerifikasiBerhasil = async () => {
    try {
      await masuk({ email: email.trim().toLowerCase(), kata_sandi: sandi })
      router.push('/teluk-kiluan')
      router.refresh()
    } catch (err) {
      setGalat(pesanGalat(err))
    }
  }

  return (
    <AuthPageShell>
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-primary-800 dark:text-primary-100">{t('title')}</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{t('subtitle')}</p>
      </div>

      {tahapVerifikasi ? (
        <>
          {pesanDaftar && (
            <p className="text-center text-sm text-primary-800 dark:text-primary-200">{pesanDaftar}</p>
          )}
          <VerifikasiKodeForm
            email={email.trim().toLowerCase()}
            onBerhasil={handleVerifikasiBerhasil}
            deskripsi={t('verifyDescription')}
          />
          <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
            {t('verifyLater')}{' '}
            <Link href="/masuk" className="font-medium text-primary-700 underline dark:text-primary-300">
              {t('verifyLaterLink')}
            </Link>
          </p>
        </>
      ) : (
        <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit}>
          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">{tFields('fullName')}</Label>
            <Input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder={tFields('namePlaceholder')}
              className="mt-1"
              required
            />
          </Field>
          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">{tFields('email')}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={tFields('emailPlaceholder')}
              className="mt-1"
              required
            />
          </Field>
          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">{tFields('password')}</Label>
            <PasswordInput
              value={sandi}
              onChange={(e) => setSandi(e.target.value)}
              className="mt-1"
              minLength={8}
              autoComplete="new-password"
              required
            />
            <p className="mt-1 text-xs text-neutral-500">{t('passwordHint')}</p>
          </Field>
          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">{tFields('confirmPassword')}</Label>
            <PasswordInput
              value={konfirmasiSandi}
              onChange={(e) => setKonfirmasiSandi(e.target.value)}
              className="mt-1"
              minLength={8}
              autoComplete="new-password"
              required
            />
            {konfirmasiSandi.length > 0 && sandi !== konfirmasiSandi && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{tErrors('passwordMismatch')}</p>
            )}
          </Field>
          {galat && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
              {galat}
            </p>
          )}
          <ButtonPrimary type="submit" disabled={memuat}>
            {memuat ? t('submitting') : t('submit')}
          </ButtonPrimary>
        </form>
      )}

      {!tahapVerifikasi && (
        <div className="block text-center text-sm text-neutral-700 dark:text-neutral-300">
          {t('hasAccount')}{' '}
          <Link href="/masuk" className="font-medium text-primary-700 underline">
            {tAuth('masuk')}
          </Link>
        </div>
      )}
    </AuthPageShell>
  )
}

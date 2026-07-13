'use client'

import DemoAkunPanel from '@/components/auth/DemoAkunPanel'
import VerifikasiKodeForm from '@/components/auth/VerifikasiKodeForm'
import AuthPageShell from '@/components/layout/AuthPageShell'
import { tampilkanPanelDemoAkun } from '@/lib/kiluan/demo-akun'
import { useAuth } from '@/contexts/AuthProvider'
import { usePesanGalat } from '@/hooks/usePesanGalat'
import { redirectSetelahLogin } from '@/lib/kiluan/peran'
import { kodeGalat } from '@/lib/api/galat'
import { Link, useRouter } from '@/i18n/navigation'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import PasswordInput from '@/shared/PasswordInput'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { FormEvent, useState } from 'react'

export default function MasukForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const { masuk } = useAuth()
  const pesanGalat = usePesanGalat()
  const t = useTranslations('auth.masukPage')
  const tFields = useTranslations('auth.fields')
  const [email, setEmail] = useState('')
  const [sandi, setSandi] = useState('')
  const [galat, setGalat] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(false)
  const [perluVerifikasi, setPerluVerifikasi] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setGalat(null)
    setPerluVerifikasi(false)
    setMemuat(true)
    try {
      const profil = await masuk({ email: email.trim().toLowerCase(), kata_sandi: sandi })
      router.push(redirectSetelahLogin(profil, redirectParam))
      router.refresh()
    } catch (err) {
      if (kodeGalat(err) === 'belum_diverifikasi') {
        setPerluVerifikasi(true)
        setGalat(pesanGalat(err))
      } else {
        setGalat(pesanGalat(err))
      }
    } finally {
      setMemuat(false)
    }
  }

  const handleVerifikasiBerhasil = async () => {
    try {
      const profil = await masuk({ email: email.trim().toLowerCase(), kata_sandi: sandi })
      router.push(redirectSetelahLogin(profil, redirectParam))
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

      {tampilkanPanelDemoAkun() && !perluVerifikasi && (
        <DemoAkunPanel
          onPilih={(e, s) => {
            setEmail(e)
            setSandi(s)
            setGalat(null)
          }}
        />
      )}

      {perluVerifikasi ? (
        <VerifikasiKodeForm
          email={email.trim().toLowerCase()}
          onBerhasil={handleVerifikasiBerhasil}
          deskripsi={t('verifyPending')}
        />
      ) : (
        <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit}>
          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">{tFields('email')}</Label>
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
              <Label>{tFields('password')}</Label>
              <Link href="/lupa-sandi" className="text-sm font-medium text-primary-700 underline">
                {t('forgotPassword')}
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
            {memuat ? t('submitting') : t('submit')}
          </ButtonPrimary>
        </form>
      )}

      <div className="block text-center text-sm text-neutral-700 dark:text-neutral-300">
        {t('noAccount')}{' '}
        <Link href="/daftar" className="font-medium text-primary-700 underline">
          {t('registerNow')}
        </Link>
      </div>
    </AuthPageShell>
  )
}

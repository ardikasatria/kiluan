'use client'

import AuthPageShell from '@/components/layout/AuthPageShell'
import { usePesanGalat } from '@/hooks/usePesanGalat'
import { apiFetch } from '@/lib/api/client'
import { Link } from '@/i18n/navigation'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { useTranslations } from 'next-intl'
import { FormEvent, useState } from 'react'

export default function LupaSandiPage() {
  const pesanGalat = usePesanGalat()
  const t = useTranslations('auth.lupaSandiPage')
  const tFields = useTranslations('auth.fields')
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
      await apiFetch<{ pesan: string }>('/api/v1/auth/lupa-sandi', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        auth: false,
      })
      setPesan(t('successMessage'))
    } catch (err) {
      setGalat(pesanGalat(err))
    } finally {
      setMemuat(false)
    }
  }

  return (
    <AuthPageShell>
      <h1 className="text-center text-xl font-semibold text-primary-800 dark:text-primary-100">{t('title')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field>
          <Label>{tFields('email')}</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" required />
        </Field>
        {pesan && <p className="text-sm text-primary-800 dark:text-primary-200">{pesan}</p>}
        {galat && <p className="text-sm text-red-700 dark:text-red-300">{galat}</p>}
        <ButtonPrimary type="submit" disabled={memuat}>
          {memuat ? t('submitting') : t('submit')}
        </ButtonPrimary>
      </form>
      <p className="text-center text-sm">
        <Link href="/masuk" className="text-primary-700 underline">
          {t('backToLogin')}
        </Link>
      </p>
    </AuthPageShell>
  )
}

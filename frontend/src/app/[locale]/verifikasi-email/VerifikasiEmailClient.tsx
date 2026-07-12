'use client'

import VerifikasiKodeForm from '@/components/auth/VerifikasiKodeForm'
import AuthPageShell from '@/components/layout/AuthPageShell'
import { Link, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export default function VerifikasiEmailClient() {
  const router = useRouter()
  const t = useTranslations('auth.verifikasiEmailPage')
  const tFields = useTranslations('auth.fields')
  const [email, setEmail] = useState('')
  const [tahapKode, setTahapKode] = useState(false)

  return (
    <AuthPageShell>
      <div className="text-center">
        <h1 className="text-xl font-semibold text-primary-800 dark:text-primary-100">{t('title')}</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{t('subtitle')}</p>
      </div>

      {tahapKode ? (
        <VerifikasiKodeForm email={email.trim().toLowerCase()} onBerhasil={() => router.push('/masuk')} />
      ) : (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {tFields('registeredEmail')}
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
            {t('continue')}
          </button>
        </div>
      )}

      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        <Link href="/masuk" className="font-medium text-primary-700 underline">
          {t('backToLogin')}
        </Link>
      </p>
    </AuthPageShell>
  )
}

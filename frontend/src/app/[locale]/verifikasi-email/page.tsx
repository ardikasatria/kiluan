import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import VerifikasiEmailClient from './VerifikasiEmailClient'

export default async function VerifikasiEmailPage() {
  const t = await getTranslations('common')

  return (
    <Suspense fallback={<div className="container py-16 text-center text-sm">{t('loading')}</div>}>
      <VerifikasiEmailClient />
    </Suspense>
  )
}

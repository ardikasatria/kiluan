import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import MasukForm from './MasukForm'

export default async function MasukPage() {
  const t = await getTranslations('common')

  return (
    <Suspense fallback={<div className="container py-16 text-center text-sm text-neutral-500">{t('loading')}</div>}>
      <MasukForm />
    </Suspense>
  )
}

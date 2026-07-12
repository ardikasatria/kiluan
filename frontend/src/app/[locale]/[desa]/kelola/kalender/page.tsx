import KelolaKalenderClient from '@/components/kiluan/KelolaKalenderClient'
import { getKalenderDesa } from '@/lib/api/kalender'
import { getTranslations } from 'next-intl/server'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function KelolaKalenderPage({ params }: Props) {
  const { desa } = await params
  const t = await getTranslations('kelola.kalender')
  const kalender = await getKalenderDesa(desa)
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-primary-800 dark:text-primary-100">{t('title')}</h2>
      <KelolaKalenderClient desaSlug={desa} awal={kalender} />
    </div>
  )
}

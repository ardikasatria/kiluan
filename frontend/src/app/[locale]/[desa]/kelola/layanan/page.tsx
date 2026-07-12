import KelolaLayananClient from '@/components/kiluan/KelolaLayananClient'
import { getLayananDesa } from '@/lib/api/layanan'
import { getTranslations } from 'next-intl/server'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function KelolaLayananPage({ params }: Props) {
  const { desa } = await params
  const t = await getTranslations('kelola.layanan')
  const layanan = await getLayananDesa(desa)
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-primary-800 dark:text-primary-100">{t('title')}</h2>
      <KelolaLayananClient desaSlug={desa} awal={layanan} />
    </div>
  )
}

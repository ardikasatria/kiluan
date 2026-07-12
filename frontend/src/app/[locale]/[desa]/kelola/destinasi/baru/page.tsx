import DestinasiForm from '@/components/kiluan/DestinasiForm'
import { getTranslations } from 'next-intl/server'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function DestinasiBaruPage({ params }: Props) {
  const { desa } = await params
  const t = await getTranslations('kelola.destinasi')
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-primary-800 dark:text-primary-100">{t('createTitle')}</h2>
      <DestinasiForm desaSlug={desa} />
    </div>
  )
}

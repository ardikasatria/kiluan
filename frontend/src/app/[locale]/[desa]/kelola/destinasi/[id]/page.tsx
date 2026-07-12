import DestinasiForm from '@/components/kiluan/DestinasiForm'
import { getDestinasiDetail } from '@/lib/api/destinasi'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; id: string }>
}

export default async function DestinasiEditPage({ params }: Props) {
  const { desa, id } = await params
  const t = await getTranslations('kelola.destinasi')
  const detail = await getDestinasiDetail(desa, id)
  if (!detail) notFound()

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-primary-800 dark:text-primary-100">
        {t('editTitle', { nama: detail.nama })}
      </h2>
      <DestinasiForm desaSlug={desa} awal={detail} />
    </div>
  )
}

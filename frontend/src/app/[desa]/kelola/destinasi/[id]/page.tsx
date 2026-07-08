import DestinasiForm from '@/components/kiluan/DestinasiForm'
import { getDestinasiDetail } from '@/lib/api/destinasi'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; id: string }>
}

export default async function DestinasiEditPage({ params }: Props) {
  const { desa, id } = await params
  const detail = await getDestinasiDetail(desa, id)
  if (!detail) notFound()

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-primary-800 dark:text-primary-100">Ubah: {detail.nama}</h2>
      <DestinasiForm desaSlug={desa} awal={detail} />
    </div>
  )
}

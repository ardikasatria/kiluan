import DestinasiKelolaListClient from '@/components/kiluan/DestinasiKelolaListClient'
import { cariDestinasiKelola } from '@/lib/api/destinasi'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function KelolaDestinasiPage({ params }: Props) {
  const { desa } = await params
  const hasil = await cariDestinasiKelola(desa)

  if (!hasil) notFound()

  return <DestinasiKelolaListClient desaSlug={desa} awal={hasil.item} />
}

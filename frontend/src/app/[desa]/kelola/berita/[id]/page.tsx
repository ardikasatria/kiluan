import BeritaKelolaClient from '@/components/kiluan/berita/BeritaKelolaClient'
import { getBeritaDetail } from '@/lib/api/berita'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; id: string }>
}

export default async function KelolaBeritaEditPage({ params }: Props) {
  const { desa, id } = await params
  const berita = await getBeritaDetail(desa, id, true)
  if (!berita) notFound()

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-primary-800 dark:text-primary-100">Ubah artikel</h2>
      <BeritaKelolaClient desaSlug={desa} awal={berita} />
    </div>
  )
}

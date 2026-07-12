import BeritaKelolaClient from '@/components/kiluan/berita/BeritaKelolaClient'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function KelolaBeritaBaruPage({ params }: Props) {
  const { desa } = await params
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-primary-800 dark:text-primary-100">Artikel baru</h2>
      <BeritaKelolaClient desaSlug={desa} />
    </div>
  )
}

import KelolaLayananClient from '@/components/kiluan/KelolaLayananClient'
import { getLayananDesa } from '@/lib/api/destinasi'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function KelolaLayananPage({ params }: Props) {
  const { desa } = await params
  const layanan = await getLayananDesa(desa)
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-primary-800 dark:text-primary-100">Layanan Wisata</h2>
      <KelolaLayananClient desaSlug={desa} awal={layanan} />
    </div>
  )
}

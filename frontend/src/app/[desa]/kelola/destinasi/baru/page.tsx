import DestinasiForm from '@/components/kiluan/DestinasiForm'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function DestinasiBaruPage({ params }: Props) {
  const { desa } = await params
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-primary-800 dark:text-primary-100">Buat Destinasi</h2>
      <DestinasiForm desaSlug={desa} />
    </div>
  )
}

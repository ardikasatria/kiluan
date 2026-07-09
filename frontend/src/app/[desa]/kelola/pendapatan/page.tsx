import PendapatanClient from '@/components/kiluan/dermaga/PendapatanClient'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function PendapatanPage({ params }: Props) {
  const { desa } = await params
  return (
    <div>
      <p className="text-sm text-primary-600">Penyedia</p>
      <h2 className="mt-1 text-xl font-bold">Pendapatan & Rekening</h2>
      <div className="mt-6">
        <PendapatanClient desaSlug={desa} />
      </div>
    </div>
  )
}

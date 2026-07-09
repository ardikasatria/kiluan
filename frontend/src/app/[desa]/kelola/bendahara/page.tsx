import BendaharaClient from '@/components/kiluan/dermaga/BendaharaClient'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function BendaharaPage({ params }: Props) {
  const { desa } = await params
  return (
    <div>
      <p className="text-sm text-primary-600">Escrow & settlement</p>
      <h2 className="mt-1 text-xl font-bold">Panel Bendahara</h2>
      <div className="mt-6">
        <BendaharaClient desaSlug={desa} />
      </div>
    </div>
  )
}

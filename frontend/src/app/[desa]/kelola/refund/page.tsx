import RefundKelolaClient from '@/components/kiluan/dermaga/RefundKelolaClient'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function RefundKelolaPage({ params }: Props) {
  const { desa } = await params
  return (
    <div>
      <p className="text-sm text-primary-600">Escrow</p>
      <h2 className="mt-1 text-xl font-bold">Kelola Refund</h2>
      <div className="mt-6">
        <RefundKelolaClient desaSlug={desa} />
      </div>
    </div>
  )
}

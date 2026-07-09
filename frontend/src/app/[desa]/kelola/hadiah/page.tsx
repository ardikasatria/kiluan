import KelolaHadiahClient from '@/components/kiluan/poin/KelolaHadiahClient'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function KelolaHadiahPage({ params }: Props) {
  const { desa } = await params
  return (
    <div>
      <p className="text-sm text-primary-600">Kupon & poin</p>
      <h2 className="mt-1 text-xl font-bold">Kelola Hadiah & Kupon</h2>
      <div className="mt-6">
        <KelolaHadiahClient desaSlug={desa} />
      </div>
    </div>
  )
}

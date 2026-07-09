import PengelolaGuard from '@/components/kiluan/PengelolaGuard'
import ValidasiKartuClient from '@/components/kiluan/naik-kelas/ValidasiKartuClient'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return { title: profil ? `Validasi Kartu — ${profil.nama}` : 'Validasi Kartu' }
}

export default async function ValidasiKartuPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <PengelolaGuard desaSlug={desa}>
      <ValidasiKartuClient desaSlug={desa} desaNama={profil.nama} />
    </PengelolaGuard>
  )
}

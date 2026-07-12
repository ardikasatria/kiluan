import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import UmkmKelolaClient from '@/components/kiluan/pasar/UmkmKelolaClient'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataPrivat } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return metadataPrivat(
    profil ? `Kelola Produk — ${profil.nama}` : 'Kelola Produk',
    desa,
    '/saya/umkm/produk',
    'Kelola produk UMKM Anda.',
  )
}

export default async function UmkmProdukPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <DasborGuard desaSlug={desa} peran="umkm">
      <UmkmKelolaClient desaSlug={desa} desaNama={profil.nama} />
    </DasborGuard>
  )
}

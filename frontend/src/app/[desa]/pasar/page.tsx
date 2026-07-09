import PasarDesaClient from '@/components/kiluan/pasar/PasarDesaClient'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return {
    title: profil ? `Pasar Desa — ${profil.nama}` : 'Pasar Desa',
    description: 'Katalog UMKM, produk lokal, dan paket wisata desa.',
  }
}

export default async function PasarDesaPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <Suspense fallback={<p className="container py-16 text-center text-sm text-neutral-500">Memuat…</p>}>
      <PasarDesaClient desaSlug={desa} desaNama={profil.nama} />
    </Suspense>
  )
}

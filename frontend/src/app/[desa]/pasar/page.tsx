import PasarDesaClient from '@/components/kiluan/pasar/PasarDesaClient'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataHalamanPublik } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return metadataHalamanPublik(desa, 'pasar', profil?.nama ?? undefined) ?? { title: 'Pasar Desa' }
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

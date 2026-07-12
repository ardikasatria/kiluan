import BeritaDaftarClient from '@/components/kiluan/berita/BeritaDaftarClient'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataDesa } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return metadataDesa({
    judul: 'Warta & Berita',
    desaSlug: desa,
    desaNama: profil?.nama,
    path: '/berita',
    deskripsi: 'Berita, pengumuman, dan cerita desa wisata.',
  })
}

export default async function BeritaPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <Suspense fallback={<p className="container py-16 text-center text-sm text-neutral-500">Memuat…</p>}>
      <BeritaDaftarClient desaSlug={desa} desaNama={profil.nama} />
    </Suspense>
  )
}

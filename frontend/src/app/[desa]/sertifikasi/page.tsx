import SertifikasiPublikClient from '@/components/kiluan/naik-kelas/SertifikasiPublikClient'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataHalamanPublik } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return metadataHalamanPublik(desa, 'sertifikasi', profil?.nama ?? undefined) ?? { title: 'sertifikasi' }
}

export default async function SertifikasiPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return <SertifikasiPublikClient desaSlug={desa} desaNama={profil.nama} />
}

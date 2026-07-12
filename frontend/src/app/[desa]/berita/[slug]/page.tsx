import BeritaDetail from '@/components/kiluan/berita/BeritaDetail'
import { getBeritaDetail } from '@/lib/api/berita'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, slug } = await params
  const berita = await getBeritaDetail(desa, slug)
  return {
    title: berita ? `${berita.judul} — Warta` : 'Artikel',
    description: berita?.ringkasan ?? undefined,
  }
}

export default async function BeritaSlugPage({ params }: Props) {
  const { desa, slug } = await params
  const [profil, berita] = await Promise.all([getProfilDesa(desa), getBeritaDetail(desa, slug)])

  if (!profil || !berita) notFound()

  return <BeritaDetail berita={berita} desaSlug={desa} desaNama={profil.nama} />
}

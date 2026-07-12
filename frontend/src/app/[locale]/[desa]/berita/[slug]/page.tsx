import BeritaDetail from '@/components/kiluan/berita/BeritaDetail'
import { getBeritaDetail } from '@/lib/api/berita'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataDesa } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, slug } = await params
  const t = await getTranslations('berita')
  const [berita, profil] = await Promise.all([getBeritaDetail(desa, slug), getProfilDesa(desa)])
  if (!berita) return { title: t('notFound') }
  return metadataDesa({
    judul: berita.judul,
    desaSlug: desa,
    desaNama: profil?.nama,
    path: `/berita/${berita.slug}`,
    deskripsi: berita.ringkasan ?? berita.judul,
    gambar: berita.sampul?.url,
    tipe: 'article',
  })
}

export default async function BeritaSlugPage({ params }: Props) {
  const { desa, slug } = await params
  const [profil, berita] = await Promise.all([getProfilDesa(desa), getBeritaDetail(desa, slug)])

  if (!profil || !berita) notFound()

  return <BeritaDetail berita={berita} desaSlug={desa} desaNama={profil.nama} />
}

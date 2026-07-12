import PesananRiwayatClient from '@/components/kiluan/dermaga/PesananRiwayatClient'
import { getProfilDesa } from '@/lib/api/desa'
import { buatMetadata } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  const t = await getTranslations('pesanan')
  return buatMetadata({
    judul: profil ? t('riwayat.seoTitleDesa', { desa: profil.nama }) : t('riwayat.seoTitle'),
    deskripsi: t('riwayat.seoDesc'),
    path: `/${desa}/pesanan`,
    noindex: true,
  })
}

export default async function PesananRiwayatPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return <PesananRiwayatClient desaSlug={desa} desaNama={profil.nama} />
}

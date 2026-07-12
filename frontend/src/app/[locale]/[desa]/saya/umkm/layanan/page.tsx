import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import UmkmLayananKelolaClient from '@/components/kiluan/pasar/UmkmLayananKelolaClient'
import { getProfilDesa } from '@/lib/api/desa'
import { getLayananDesa } from '@/lib/api/layanan'
import { metadataPrivat } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const [profil, t] = await Promise.all([getProfilDesa(desa), getTranslations('pasar.umkmLayanan')])
  return metadataPrivat(
    profil ? `${t('title')} — ${profil.nama}` : t('title'),
    desa,
    '/saya/umkm/layanan',
    t('title'),
  )
}

export default async function UmkmLayananPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  const layanan = await getLayananDesa(desa)

  return (
    <DasborGuard desaSlug={desa} peran="umkm">
      <UmkmLayananKelolaClient desaSlug={desa} desaNama={profil.nama} awal={layanan} />
    </DasborGuard>
  )
}

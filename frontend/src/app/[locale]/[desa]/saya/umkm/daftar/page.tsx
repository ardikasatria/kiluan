import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import UmkmDaftarClient from '@/components/kiluan/pasar/UmkmDaftarClient'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataPrivat } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const [profil, t] = await Promise.all([getProfilDesa(desa), getTranslations('pasar.umkmDaftar')])
  return metadataPrivat(
    profil ? `${t('title')} — ${profil.nama}` : t('title'),
    desa,
    '/saya/umkm/daftar',
    t('title'),
  )
}

export default async function UmkmDaftarPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <DasborGuard desaSlug={desa} peran="umkm">
      <UmkmDaftarClient desaSlug={desa} desaNama={profil.nama} lokasiDesa={profil.lokasi ?? null} />
    </DasborGuard>
  )
}

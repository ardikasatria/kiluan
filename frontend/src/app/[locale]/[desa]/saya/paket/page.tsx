import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import PaketKelolaClient from '@/components/kiluan/pasar/PaketKelolaClient'
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
  const [profil, t] = await Promise.all([getProfilDesa(desa), getTranslations('pasar.paketKelola')])
  return metadataPrivat(
    profil ? `${t('title')} — ${profil.nama}` : t('title'),
    desa,
    '/saya/paket',
    t('title'),
  )
}

export default async function AgenPaketPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <DasborGuard desaSlug={desa} peran="agen">
      <PaketKelolaClient desaSlug={desa} desaNama={profil.nama} />
    </DasborGuard>
  )
}

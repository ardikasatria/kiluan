import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import LencanaSayaClient from '@/components/kiluan/lencana/LencanaSayaClient'
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
  const t = await getTranslations('lencana')
  return buatMetadata({
    judul: profil ? t('seo.titleDesa', { desa: profil.nama }) : t('seo.title'),
    deskripsi: t('seo.description'),
    path: `/${desa}/saya/lencana`,
    noindex: true,
  })
}

export default async function LencanaSayaPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <DasborGuard desaSlug={desa} loginOnly>
      <LencanaSayaClient desaSlug={desa} desaNama={profil.nama} />
    </DasborGuard>
  )
}

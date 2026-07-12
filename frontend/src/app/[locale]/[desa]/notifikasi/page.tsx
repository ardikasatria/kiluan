import NotifikasiInboxClient from '@/components/kiluan/notifikasi/NotifikasiInboxClient'
import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import { getProfilDesa } from '@/lib/api/desa'
import { buatMetadata } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  const t = await getTranslations('genta')
  return buatMetadata({
    judul: profil ? t('seo.titleDesa', { desa: profil.nama }) : t('seo.title'),
    deskripsi: t('seo.description'),
    path: `/${desa}/notifikasi`,
    noindex: true,
  })
}

export default async function NotifikasiPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()
  const t = await getTranslations('genta')

  return (
    <DasborGuard desaSlug={desa} loginOnly>
      <Suspense fallback={<p className="container py-16 text-center text-sm text-neutral-500">{t('loading')}</p>}>
        <NotifikasiInboxClient desaSlug={desa} desaNama={profil.nama} />
      </Suspense>
    </DasborGuard>
  )
}

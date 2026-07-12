import NotifikasiInboxClient from '@/components/kiluan/notifikasi/NotifikasiInboxClient'
import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return {
    title: profil ? `Genta — ${profil.nama}` : 'Notifikasi',
    description: 'Kotak masuk notifikasi aktivitas transaksi.',
  }
}

export default async function NotifikasiPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <DasborGuard desaSlug={desa} loginOnly>
      <Suspense fallback={<p className="container py-16 text-center text-sm text-neutral-500">Memuat…</p>}>
        <NotifikasiInboxClient desaSlug={desa} desaNama={profil.nama} />
      </Suspense>
    </DasborGuard>
  )
}

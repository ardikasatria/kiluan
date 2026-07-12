import CheckoutClient from '@/components/kiluan/dermaga/CheckoutClient'
import { getProfilDesa } from '@/lib/api/desa'
import { buatMetadata } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return buatMetadata({
    judul: profil ? `Checkout — ${profil.nama}` : 'Checkout',
    deskripsi: 'Selesaikan pembayaran pesanan wisata Anda.',
    path: `/${desa}/checkout`,
    noindex: true,
  })
}

export default async function CheckoutPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <Suspense fallback={<p className="container py-16 text-center text-sm">Memuat…</p>}>
      <CheckoutClient desaSlug={desa} desaNama={profil.nama} />
    </Suspense>
  )
}

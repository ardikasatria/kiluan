import VerifikatorClient from '@/components/kiluan/penjelajah/VerifikatorClient'
import { getProfilDesa } from '@/lib/api/desa'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export const metadata: Metadata = { title: 'Antrean verifikasi' }

export default async function VerifikasiKelolaPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold">Verifikasi Penjelajah</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Konfirmasi stempel misi dengan metode pemandu — {profil.nama}
      </p>
      <div className="mt-8">
        <VerifikatorClient desaSlug={desa} />
      </div>
    </div>
  )
}

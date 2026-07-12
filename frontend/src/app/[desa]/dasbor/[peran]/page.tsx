import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import RoleDashboardView from '@/components/kiluan/dashboard/RoleDashboardView'
import { getProfilDesa } from '@/lib/api/desa'
import { ambilStatsDasbor } from '@/lib/kiluan/dashboard-stats'
import { konfigDasborPeran } from '@/lib/kiluan/dashboard-peran'
import { peranDariSlug } from '@/lib/kiluan/peran'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; peran: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, peran } = await params
  const kode = peranDariSlug(peran)
  if (!kode) return { title: 'Dasbor' }
  const cfg = konfigDasborPeran(desa)[kode]
  return { title: `Dasbor — ${cfg?.tagline ?? peran}` }
}

export default async function DasborPeranPage({ params }: Props) {
  const { desa, peran: peranSlug } = await params
  const kode = peranDariSlug(peranSlug)
  if (!kode || kode === 'admin') notFound()

  const [profil, statsOverride] = await Promise.all([
    getProfilDesa(desa),
    ambilStatsDasbor(desa, kode),
  ])
  if (!profil) notFound()

  const config = konfigDasborPeran(desa)[kode]

  return (
    <DasborGuard desaSlug={desa} desaNama={profil.nama} peran={kode}>
      <RoleDashboardView
        desaSlug={desa}
        desaNama={profil.nama}
        config={config}
        statsOverride={statsOverride}
      />
    </DasborGuard>
  )
}

import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import RoleDashboardView from '@/components/kiluan/dashboard/RoleDashboardView'
import { getProfilDesa } from '@/lib/api/desa'
import { ambilStatsDasbor } from '@/lib/kiluan/dashboard-stats'
import { konfigDasborPeran, type PenerjemahDasbor } from '@/lib/kiluan/dashboard-peran'
import { peranDariSlug, type PeranKode } from '@/lib/kiluan/peran'
import { metadataDasbor } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; peran: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, peran } = await params
  const kode = peranDariSlug(peran)
  if (!kode) return metadataDasbor('Dasbor', desa)
  const t = await getTranslations(`dasbor.${kode}` as 'dasbor.pokdarwis')
  return metadataDasbor(t('tagline'), desa, `/${peran}`)
}

export default async function DasborPeranPage({ params }: Props) {
  const { desa, peran: peranSlug } = await params
  const kode = peranDariSlug(peranSlug)
  if (!kode || kode === 'admin') notFound()

  const t = await getTranslations(`dasbor.${kode}` as 'dasbor.pokdarwis')
  const translators: Partial<Record<PeranKode, PenerjemahDasbor>> = {
    [kode]: t as unknown as PenerjemahDasbor,
  }

  const [profil, statsOverride] = await Promise.all([
    getProfilDesa(desa),
    ambilStatsDasbor(desa, kode),
  ])
  if (!profil) notFound()

  const config = konfigDasborPeran(desa, translators)[kode]

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

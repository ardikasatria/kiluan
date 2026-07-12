import RoleDashboardView from '@/components/kiluan/dashboard/RoleDashboardView'
import { konfigDasborWisatawan } from '@/lib/kiluan/dashboard-peran'
import { metadataPrivat } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dasbor.seo')
  return metadataPrivat(t('wisatawanTitle'), 'sigerciv', '/dasbor/wisatawan', t('wisatawanDescription'))
}

export default async function DasborWisatawanGlobalPage() {
  const t = await getTranslations('dasbor.wisatawan')
  const config = konfigDasborWisatawan(t as unknown as (key: string) => string)

  return (
    <RoleDashboardView
      desaSlug="sigerciv"
      desaNama="Sigerciv · Lampung"
      config={config}
      lintasDesa
    />
  )
}

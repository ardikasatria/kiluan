import RoleDashboardView from '@/components/kiluan/dashboard/RoleDashboardView'
import { konfigDasborWisatawan } from '@/lib/kiluan/dashboard-peran'
import { metadataPrivat } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'

export const metadata: Metadata = metadataPrivat(
  'Dasbor Wisatawan',
  'sigerciv',
  '/dasbor/wisatawan',
  'Dasbor wisatawan Sigerciv — jelajah dan kontribusi lintas desa Lampung.',
)

export default function DasborWisatawanGlobalPage() {
  const config = konfigDasborWisatawan()

  return (
    <RoleDashboardView
      desaSlug="sigerciv"
      desaNama="Sigerciv · Lampung"
      config={config}
      lintasDesa
    />
  )
}

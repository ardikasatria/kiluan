import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import RoleDashboardView from '@/components/kiluan/dashboard/RoleDashboardView'
import KiluanMeshBackground from '@/components/kiluan/KiluanMeshBackground'
import { konfigDasborPeran } from '@/lib/kiluan/dashboard-peran'
import { ApplicationLayout } from '@/app/(app)/application-layout'
import Aside from '@/components/aside'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dasbor Admin — sigerciv',
  description: 'Steward platform: tenant, moderasi, dan konfigurasi Nusantara.',
}

export default function AdminDasborPage() {
  const config = konfigDasborPeran('teluk-kiluan').admin

  return (
    <Aside.Provider>
      <ApplicationLayout headerHasBorder>
        <KiluanMeshBackground className="min-h-screen">
          <DasborGuard desaSlug="teluk-kiluan" desaNama="Lintas desa" peran="admin">
            <div className="container py-6 sm:py-10">
              <RoleDashboardView
                desaSlug="teluk-kiluan"
                desaNama="Steward platform"
                config={config}
              />
            </div>
          </DasborGuard>
        </KiluanMeshBackground>
      </ApplicationLayout>
    </Aside.Provider>
  )
}

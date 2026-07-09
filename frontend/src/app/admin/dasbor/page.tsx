import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import RoleDashboardView from '@/components/kiluan/dashboard/RoleDashboardView'
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
        <DasborGuard desaSlug="teluk-kiluan" peran="admin">
          <div className="container py-8 sm:py-12">
            <div className="mb-8">
              <p className="text-xs font-medium tracking-wide text-primary-600 uppercase dark:text-primary-400">
                Steward platform
              </p>
              <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100">Dasbor Admin</h1>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Lintas-tenant · modul Nusantara (Fase 4)
              </p>
            </div>
            <RoleDashboardView desaSlug="teluk-kiluan" config={config} />
          </div>
        </DasborGuard>
      </ApplicationLayout>
    </Aside.Provider>
  )
}

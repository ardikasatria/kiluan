import DashboardSectionPlaceholder from '@/components/kiluan/dashboard/DashboardSectionPlaceholder'
import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import { konfigDasborPeran } from '@/lib/kiluan/dashboard-peran'
import { ApplicationLayout } from '@/app/(app)/application-layout'
import Aside from '@/components/aside'

interface Props {
  params: Promise<{ section: string }>
}

export default async function AdminDasborSectionPage({ params }: Props) {
  const { section } = await params
  const config = konfigDasborPeran('teluk-kiluan').admin
  const navItem = config.nav.find((n) => n.segment === `/${section}`)

  return (
    <Aside.Provider>
      <ApplicationLayout headerHasBorder>
        <DasborGuard desaSlug="teluk-kiluan" desaNama="Lintas desa" peran="admin">
            <div className="container py-8 sm:py-10">
              <DashboardSectionPlaceholder
                desaSlug="teluk-kiluan"
                desaNama="Steward platform"
                config={config}
                sectionLabel={navItem?.label ?? section}
              />
            </div>
          </DasborGuard>
      </ApplicationLayout>
    </Aside.Provider>
  )
}

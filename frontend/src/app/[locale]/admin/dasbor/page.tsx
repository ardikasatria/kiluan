import RoleDashboardView from '@/components/kiluan/dashboard/RoleDashboardView'
import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import { konfigDasborPeran, type PenerjemahDasbor } from '@/lib/kiluan/dashboard-peran'
import { ApplicationLayout } from '@/app/[locale]/(app)/application-layout'
import Aside from '@/components/aside'
import { metadataPrivat } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dasbor.seo')
  return metadataPrivat(t('adminTitle'), 'sigerciv', '/admin/dasbor', t('adminDescription'))
}

export default async function AdminDasborPage() {
  const [t, tSwitcher] = await Promise.all([
    getTranslations('dasbor.admin'),
    getTranslations('dasbor.switcher'),
  ])
  const translators = { admin: t as unknown as PenerjemahDasbor }
  const config = konfigDasborPeran('teluk-kiluan', translators).admin

  return (
    <Aside.Provider>
      <ApplicationLayout headerHasBorder>
        <DasborGuard desaSlug="teluk-kiluan" desaNama={tSwitcher('lintasDesa')} peran="admin">
          <div className="container py-8 sm:py-10">
            <RoleDashboardView
              desaSlug="teluk-kiluan"
              desaNama={t('tagline')}
              config={config}
            />
          </div>
        </DasborGuard>
      </ApplicationLayout>
    </Aside.Provider>
  )
}

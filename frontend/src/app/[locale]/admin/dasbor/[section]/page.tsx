import DashboardSectionPlaceholder from '@/components/kiluan/dashboard/DashboardSectionPlaceholder'
import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import { konfigDasborPeran, type PenerjemahDasbor } from '@/lib/kiluan/dashboard-peran'
import { ApplicationLayout } from '@/app/[locale]/(app)/application-layout'
import Aside from '@/components/aside'
import { metadataPrivat } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ section: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dasbor.seo')
  return metadataPrivat(t('adminTitle'), 'sigerciv', '/admin/dasbor', t('adminDescription'))
}

export default async function AdminDasborSectionPage({ params }: Props) {
  const { section } = await params
  const [t, tSwitcher] = await Promise.all([
    getTranslations('dasbor.admin'),
    getTranslations('dasbor.switcher'),
  ])
  const translators = { admin: t as unknown as PenerjemahDasbor }
  const config = konfigDasborPeran('teluk-kiluan', translators).admin
  const navItem = config.nav.find((n) => n.segment === `/${section}`)

  return (
    <Aside.Provider>
      <ApplicationLayout headerHasBorder>
        <DasborGuard desaSlug="teluk-kiluan" desaNama={tSwitcher('lintasDesa')} peran="admin">
          <div className="container py-8 sm:py-10">
            <DashboardSectionPlaceholder
              desaSlug="teluk-kiluan"
              desaNama={t('tagline')}
              config={config}
              sectionLabel={navItem?.label ?? section}
            />
          </div>
        </DasborGuard>
      </ApplicationLayout>
    </Aside.Provider>
  )
}

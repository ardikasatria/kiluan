'use client'

import DashboardNavDrawer from '@/components/kiluan/dashboard/DashboardNavDrawer'
import DashboardShell from '@/components/kiluan/dashboard/DashboardShell'
import DashboardSidebar from '@/components/kiluan/dashboard/DashboardSidebar'
import DashboardTopbar from '@/components/kiluan/dashboard/DashboardTopbar'
import type { DashboardPeranConfig } from '@/lib/kiluan/dashboard-peran'
import { labelPeran } from '@/lib/kiluan/peran'
import { useTranslations } from 'next-intl'
import { useState, type ReactNode } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
  config: DashboardPeranConfig
  sectionTitle?: string
  lintasDesa?: boolean
  children: ReactNode
}

/** Shell dasbor peran — sidebar desktop + drawer mobile dari kiri. */
export default function DashboardViewShell({
  desaSlug,
  desaNama,
  config,
  sectionTitle,
  lintasDesa = false,
  children,
}: Props) {
  const t = useTranslations('dasbor.view')
  const tPeran = useTranslations('peran')
  const judulBagian = sectionTitle ?? t('ringkasan')
  const [navOpen, setNavOpen] = useState(false)

  const sidebar = (
    <DashboardSidebar
      desaSlug={desaSlug}
      peran={config.kode}
      nav={config.nav}
      tagline={config.tagline}
    />
  )

  return (
    <>
      <DashboardShell
        sidebar={sidebar}
        topbar={
          <DashboardTopbar
            desaSlug={desaSlug}
            desaNama={desaNama}
            config={config}
            sectionTitle={judulBagian}
            onOpenNav={() => setNavOpen(true)}
            lintasDesa={lintasDesa}
          />
        }
      >
        {children}
      </DashboardShell>

      <DashboardNavDrawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        title={labelPeran(config.kode, tPeran)}
      >
        <div id="dashboard-mobile-nav">
          <DashboardSidebar
            desaSlug={desaSlug}
            peran={config.kode}
            nav={config.nav}
            tagline={config.tagline}
            compact
            onNavigate={() => setNavOpen(false)}
          />
        </div>
      </DashboardNavDrawer>
    </>
  )
}

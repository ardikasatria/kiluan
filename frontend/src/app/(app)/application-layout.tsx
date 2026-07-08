import Footer from '@/components/Footer/Footer'
import Header from '@/components/Header/Header'
import Header2 from '@/components/Header/Header2'
import KiluanHeader from '@/components/Header/KiluanHeader'
import OfflineIndicator from '@/components/kiluan/OfflineIndicator'
import AsideSidebarNavigation from '@/components/aside-sidebar-navigation'
import Banner from '@/shared/banner'
import React, { ReactNode } from 'react'

interface Props {
  children: ReactNode
  headerHasBorder?: boolean
  headerStyle?: 'kiluan' | 'header-1' | 'header-2'
  showBanner?: boolean
}

const ApplicationLayout: React.FC<Props> = ({
  children,
  headerHasBorder,
  headerStyle = 'kiluan',
  showBanner = false,
}) => {
  return (
    <>
      {showBanner && <Banner />}
      {headerStyle === 'kiluan' && <KiluanHeader bottomBorder={headerHasBorder} />}
      {headerStyle === 'header-2' && <Header2 bottomBorder={headerHasBorder} />}
      {headerStyle === 'header-1' && <Header bottomBorder={headerHasBorder} />}

      {children}

      <div className="pointer-events-none fixed bottom-4 left-4 z-40">
        <div className="pointer-events-auto">
          <OfflineIndicator />
        </div>
      </div>

      {/* footer - Chose footer style here / footer 1 or footer 2 or footer 3 or footer 4 */}
      <Footer />
      {/* aside sidebar navigation */}
      <AsideSidebarNavigation />
    </>
  )
}

export { ApplicationLayout }

import { ApplicationLayout } from '@/app/[locale]/(app)/application-layout'
import KiluanMeshBackground from '@/components/kiluan/KiluanMeshBackground'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

const Layout: React.FC<Props> = ({ children }) => {
  return (
    <KiluanMeshBackground className="min-h-screen">
      <ApplicationLayout headerVariant="landing">{children}</ApplicationLayout>
    </KiluanMeshBackground>
  )
}

export default Layout

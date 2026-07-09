import { ApplicationLayout } from '@/app/(app)/application-layout'
import Aside from '@/components/aside'
import KiluanMeshBackground from '@/components/kiluan/KiluanMeshBackground'

export default function AuthPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <KiluanMeshBackground className="min-h-screen">
      <Aside.Provider>
        <ApplicationLayout headerHasBorder>{children}</ApplicationLayout>
      </Aside.Provider>
    </KiluanMeshBackground>
  )
}

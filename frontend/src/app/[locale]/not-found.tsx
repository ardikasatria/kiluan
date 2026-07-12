import { ApplicationLayout } from '@/app/[locale]/(app)/application-layout'
import Aside from '@/components/aside'
import NotFoundView from '@/components/kiluan/NotFoundView'
import KiluanMeshBackground from '@/components/kiluan/KiluanMeshBackground'

export default function LocaleNotFoundPage() {
  return (
    <KiluanMeshBackground className="min-h-screen">
      <Aside.Provider>
        <ApplicationLayout headerHasBorder>
          <NotFoundView />
        </ApplicationLayout>
      </Aside.Provider>
    </KiluanMeshBackground>
  )
}

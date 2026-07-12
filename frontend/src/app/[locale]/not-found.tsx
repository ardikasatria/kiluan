import { ApplicationLayout } from '@/app/[locale]/(app)/application-layout'
import NotFoundView from '@/components/kiluan/NotFoundView'
import KiluanMeshBackground from '@/components/kiluan/KiluanMeshBackground'

export default function LocaleNotFoundPage() {
  return (
    <KiluanMeshBackground className="min-h-screen">
      <ApplicationLayout headerHasBorder>
        <NotFoundView />
      </ApplicationLayout>
    </KiluanMeshBackground>
  )
}

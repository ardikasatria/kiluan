import { ApplicationLayout } from '@/app/(app)/application-layout'
import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import Aside from '@/components/aside'

export default function SayaGlobalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Aside.Provider>
      <ApplicationLayout headerHasBorder>
        <DasborGuard desaSlug="sigerciv" loginOnly>
          <div className="container py-8 sm:py-10">{children}</div>
        </DasborGuard>
      </ApplicationLayout>
    </Aside.Provider>
  )
}

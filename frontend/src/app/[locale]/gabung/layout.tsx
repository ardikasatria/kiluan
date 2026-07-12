import { ApplicationLayout } from '@/app/[locale]/(app)/application-layout'
import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import Aside from '@/components/aside'
import { RUTE_GABUNG } from '@/lib/kiluan/rute-sigerciv'

export default function GabungLayout({ children }: { children: React.ReactNode }) {
  return (
    <Aside.Provider>
      <ApplicationLayout headerHasBorder>
        <DasborGuard desaSlug="sigerciv" loginOnly redirectAfterLogin={RUTE_GABUNG}>
          <div className="container py-8 sm:py-10">{children}</div>
        </DasborGuard>
      </ApplicationLayout>
    </Aside.Provider>
  )
}

import { ApplicationLayout } from '@/app/[locale]/(app)/application-layout'
import Aside from '@/components/aside'

export default function PasporLayout({ children }: { children: React.ReactNode }) {
  return (
    <Aside.Provider>
      <ApplicationLayout headerHasBorder>{children}</ApplicationLayout>
    </Aside.Provider>
  )
}

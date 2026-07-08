import { ApplicationLayout } from '@/app/(app)/application-layout'
import Aside from '@/components/aside'

export default function DesaLayout({ children }: { children: React.ReactNode }) {
  return (
    <Aside.Provider>
      <ApplicationLayout>{children}</ApplicationLayout>
    </Aside.Provider>
  )
}

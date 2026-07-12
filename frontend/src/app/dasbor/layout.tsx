import { ApplicationLayout } from '@/app/(app)/application-layout'
import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import Aside from '@/components/aside'
import { metadataPrivat } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'

export const metadata: Metadata = metadataPrivat(
  'Dasbor Sigerciv',
  'sigerciv',
  '/dasbor',
  'Dasbor pengguna Sigerciv — lintas desa wisata Lampung.',
)

export default function DasborGlobalLayout({ children }: { children: React.ReactNode }) {
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

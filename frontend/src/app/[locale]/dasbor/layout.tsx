import { ApplicationLayout } from '@/app/[locale]/(app)/application-layout'
import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import Aside from '@/components/aside'
import { metadataPrivat } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dasbor.seo')
  return metadataPrivat(t('hubTitle'), 'sigerciv', '/dasbor', t('hubDescription'))
}

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

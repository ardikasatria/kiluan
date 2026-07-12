import { ApplicationLayout } from '@/app/[locale]/(app)/application-layout'
import Aside from '@/components/aside'
import { buatMetadata } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('cari.seo')
  return buatMetadata({
    judul: t('title'),
    deskripsi: t('description'),
    path: '/cari',
  })
}

export default function CariLayout({ children }: { children: React.ReactNode }) {
  return (
    <Aside.Provider>
      <ApplicationLayout headerHasBorder>{children}</ApplicationLayout>
    </Aside.Provider>
  )
}

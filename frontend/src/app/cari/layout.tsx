import { ApplicationLayout } from '@/app/(app)/application-layout'
import Aside from '@/components/aside'
import { buatMetadata } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'

export const metadata: Metadata = buatMetadata({
  judul: 'Cari Destinasi',
  deskripsi: 'Jelajahi destinasi wisata regeneratif di seluruh desa sigerciv.',
  path: '/cari',
})

export default function CariLayout({ children }: { children: React.ReactNode }) {
  return (
    <Aside.Provider>
      <ApplicationLayout headerHasBorder>{children}</ApplicationLayout>
    </Aside.Provider>
  )
}

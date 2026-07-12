import { ApplicationLayout } from '@/app/(app)/application-layout'
import Aside from '@/components/aside'
import { getProfilDesa } from '@/lib/api/desa'
import { buatMetadata } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'

interface Props {
  children: React.ReactNode
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  const nama = profil?.nama ?? desa
  return buatMetadata({
    judul: nama,
    deskripsi: profil?.deskripsi ?? `Etalase wisata regeneratif ${nama} di sigerciv.`,
    path: `/${desa}`,
    gambar: profil?.logo ?? undefined,
  })
}

export default function DesaLayout({ children }: { children: React.ReactNode }) {
  return (
    <Aside.Provider>
      <ApplicationLayout headerHasBorder>{children}</ApplicationLayout>
    </Aside.Provider>
  )
}

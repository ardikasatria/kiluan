import { ApplicationLayout } from '@/app/[locale]/(app)/application-layout'
import Aside from '@/components/aside'
import { getProfilDesa } from '@/lib/api/desa'
import { buatMetadata } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

interface Props {
  children: React.ReactNode
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const [profil, t] = await Promise.all([getProfilDesa(desa), getTranslations('etalase')])
  const nama = profil?.nama ?? desa
  return buatMetadata({
    judul: nama,
    deskripsi: profil?.deskripsi ?? t('seoFallback', { desa: nama }),
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

import AuthPageLayout from '@/components/layout/AuthPageLayout'
import { buatMetadata } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.daftarPage.seo')
  return buatMetadata({
    judul: t('title'),
    deskripsi: t('description'),
    path: '/daftar',
    noindex: true,
  })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthPageLayout>{children}</AuthPageLayout>
}

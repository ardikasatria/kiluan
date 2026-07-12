import AuthPageLayout from '@/components/layout/AuthPageLayout'
import { buatMetadata } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'

export const metadata: Metadata = buatMetadata({
  judul: 'Masuk',
  deskripsi: 'Masuk ke akun sigerciv untuk mengakses dasbor, paspor lestari, dan fitur komunitas.',
  path: '/masuk',
  noindex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthPageLayout>{children}</AuthPageLayout>
}

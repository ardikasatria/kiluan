import AuthPageLayout from '@/components/layout/AuthPageLayout'
import { buatMetadata } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'

export const metadata: Metadata = buatMetadata({
  judul: 'Verifikasi Email',
  deskripsi: 'Verifikasi alamat email akun sigerciv Anda.',
  path: '/verifikasi-email',
  noindex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthPageLayout>{children}</AuthPageLayout>
}

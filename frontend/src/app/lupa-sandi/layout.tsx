import AuthPageLayout from '@/components/layout/AuthPageLayout'
import { buatMetadata } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'

export const metadata: Metadata = buatMetadata({
  judul: 'Lupa Kata Sandi',
  deskripsi: 'Atur ulang kata sandi akun sigerciv Anda.',
  path: '/lupa-sandi',
  noindex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthPageLayout>{children}</AuthPageLayout>
}

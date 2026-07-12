import AuthPageLayout from '@/components/layout/AuthPageLayout'
import { buatMetadata } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'

export const metadata: Metadata = buatMetadata({
  judul: 'Daftar',
  deskripsi: 'Gabung sigerciv sebagai wisatawan, UMKM, agen, atau pengelola desa wisata.',
  path: '/daftar',
  noindex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthPageLayout>{children}</AuthPageLayout>
}

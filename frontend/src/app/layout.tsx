import '@/styles/tailwind.css'
import { niveauGrotesk } from '@/lib/fonts'
import { DESKRIPSI_DEFAULT, GAMBAR_OG_DEFAULT, NAMA_SITUS, urlSitus } from '@/lib/kiluan/seo'
import { Metadata } from 'next'
import ThemeProvider from './theme-provider'
import { AuthProvider } from '@/contexts/AuthProvider'
import { DesaKonteksProvider } from '@/contexts/DesaKonteksProvider'

export const metadata: Metadata = {
  metadataBase: new URL(urlSitus()),
  title: {
    template: `%s - ${NAMA_SITUS}`,
    default: `${NAMA_SITUS} — Platform Desa Wisata Regeneratif`,
  },
  description: DESKRIPSI_DEFAULT,
  keywords: ['sigerciv', 'Desa Wisata', 'Regeneratif', 'Teluk Kiluan', 'Ekowisata', 'Wisata Berkelanjutan'],
  applicationName: NAMA_SITUS,
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: NAMA_SITUS,
    title: `${NAMA_SITUS} — Platform Desa Wisata Regeneratif`,
    description: DESKRIPSI_DEFAULT,
    images: [{ url: GAMBAR_OG_DEFAULT, alt: NAMA_SITUS }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${NAMA_SITUS} — Platform Desa Wisata Regeneratif`,
    description: DESKRIPSI_DEFAULT,
    images: [GAMBAR_OG_DEFAULT],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${niveauGrotesk.variable} ${niveauGrotesk.className}`}>
      <body className="bg-white font-sans text-base text-neutral-900 dark:bg-neutral-900 dark:text-neutral-200">
        <ThemeProvider>
          <AuthProvider>
            <DesaKonteksProvider>
              <div>{children}</div>
            </DesaKonteksProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

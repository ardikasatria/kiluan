import '@/styles/tailwind.css'
import { niveauGrotesk } from '@/lib/fonts'
import { Metadata } from 'next'
import ThemeProvider from './theme-provider'
import { AuthProvider } from '@/contexts/AuthProvider'
import { DesaKonteksProvider } from '@/contexts/DesaKonteksProvider'

export const metadata: Metadata = {
  title: {
    template: '%s - sigerciv',
    default: 'sigerciv — Platform Desa Wisata Regeneratif',
  },
  description: 'sigerciv — platform desa wisata regeneratif berbasis komunitas. Teluk Kiluan, Lampung.',
  keywords: ['sigerciv', 'Desa Wisata', 'Regeneratif', 'Teluk Kiluan', 'Ekowisata'],
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

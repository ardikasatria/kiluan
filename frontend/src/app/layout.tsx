import '@/styles/tailwind.css'
import { niveauGrotesk } from '@/lib/fonts'
import { Metadata } from 'next'
import ThemeProvider from './theme-provider'
import { AuthProvider } from '@/contexts/AuthProvider'

export const metadata: Metadata = {
  title: {
    template: '%s - Kiluan',
    default: 'Kiluan — Platform Desa Wisata Regeneratif',
  },
  description: 'Kiluan — platform desa wisata regeneratif berbasis komunitas. Teluk Kiluan, Lampung.',
  keywords: ['Kiluan', 'Desa Wisata', 'Regeneratif', 'Teluk Kiluan', 'Ekowisata'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${niveauGrotesk.variable} ${niveauGrotesk.className}`}>
      <body className="bg-white font-sans text-base text-neutral-900 dark:bg-neutral-900 dark:text-neutral-200">
        <ThemeProvider>
          <AuthProvider>
            <div>{children}</div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

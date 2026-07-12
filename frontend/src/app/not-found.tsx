import '@/styles/tailwind.css'
import Sigerciv404Illustration from '@/components/kiluan/Sigerciv404Illustration'
import { defaultLocale } from '@/i18n/routing'
import { niveauGrotesk } from '@/lib/fonts'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 - Sigerciv',
  robots: { index: false, follow: false },
}

/** Fallback global bila rute di luar segmen locale — arahkan ke beranda locale default. */
export default function RootNotFoundPage() {
  const homeHref = `/${defaultLocale}`

  return (
    <html lang={defaultLocale} className={`${niveauGrotesk.variable} ${niveauGrotesk.className}`}>
      <body className="kiluan-mesh-bg min-h-screen bg-white font-sans text-base text-neutral-900 dark:bg-neutral-900 dark:text-neutral-200">
        <main className="container flex min-h-screen flex-col items-center justify-center py-16">
          <div className="kiluan-glass-panel w-full max-w-lg overflow-hidden p-6 text-center">
            <Sigerciv404Illustration className="mx-auto w-full max-w-sm" title="Spot tidak ditemukan di peta" />
            <h1 className="mt-6 text-2xl font-bold text-primary-900 dark:text-primary-50">Halaman tidak ditemukan</h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              Spot ini belum ada di peta sigerciv — mungkin sudah dipindahkan atau alamatnya salah.
            </p>
            <a
              href={homeHref}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-800"
            >
              Kembali ke beranda
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}

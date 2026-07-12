import '@/styles/tailwind.css'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { niveauGrotesk } from '@/lib/fonts'
import { routing, type Locale } from '@/i18n/routing'
import { DESKRIPSI_DEFAULT, GAMBAR_OG_DEFAULT, JUDUL_PLATFORM, NAMA_SITUS, urlSitus } from '@/lib/kiluan/seo'
import ThemeProvider from '../theme-provider'
import { AuthProvider } from '@/contexts/AuthProvider'
import { DesaKonteksProvider } from '@/contexts/DesaKonteksProvider'
import type { Metadata } from 'next'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { locale } = await params
  const ogLocale = locale === 'en' ? 'en_US' : 'id_ID'

  return {
    metadataBase: new URL(urlSitus()),
    title: {
      template: `%s - ${NAMA_SITUS}`,
      default: JUDUL_PLATFORM,
    },
    description: DESKRIPSI_DEFAULT,
    keywords: ['sigerciv', 'Lampung', 'Desa Wisata', 'Pariwisata Regeneratif', 'Ekowisata', 'Wisata Berkelanjutan'],
    applicationName: NAMA_SITUS,
    openGraph: {
      type: 'website',
      locale: ogLocale,
      siteName: NAMA_SITUS,
      title: JUDUL_PLATFORM,
      description: DESKRIPSI_DEFAULT,
      images: [{ url: GAMBAR_OG_DEFAULT, alt: NAMA_SITUS }],
    },
    twitter: {
      card: 'summary_large_image',
      title: JUDUL_PLATFORM,
      description: DESKRIPSI_DEFAULT,
      images: [GAMBAR_OG_DEFAULT],
    },
    robots: { index: true, follow: true },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale as Locale)
  const messages = await getMessages()

  return (
    <html lang={locale === 'en' ? 'en' : 'id'} className={`${niveauGrotesk.variable} ${niveauGrotesk.className}`}>
      <body className="bg-white font-sans text-base text-neutral-900 dark:bg-neutral-900 dark:text-neutral-200">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AuthProvider>
              <DesaKonteksProvider>
                <div>{children}</div>
              </DesaKonteksProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

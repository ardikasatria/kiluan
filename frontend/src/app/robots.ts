import { daftarDesaDiscovery } from '@/lib/api/discovery'
import { DESA_DEFAULT } from '@/lib/kiluan/meta-halaman'
import { urlSitus } from '@/lib/kiluan/seo'
import type { MetadataRoute } from 'next'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = urlSitus()

  const disallow: string[] = [
    '/dashboard/',
    '/admin/',
    '/masuk',
    '/daftar',
    '/lupa-sandi',
    '/verifikasi-email',
    '/submission',
    '/post/',
    '/author/',
    '/category/',
    '/tag/',
    '/about',
    '/contact',
    '/subscription',
    '/search',
    '/search-2',
    '/home-2',
    '/home-3',
    '/home-4',
    '/home-5',
    '/home-6',
    '/login',
    '/signup',
    '/forgot-password',
  ]

  let desaSlugs: string[] = [DESA_DEFAULT]
  try {
    const res = await daftarDesaDiscovery({ batas: 50 })
    if (res.item.length) desaSlugs = [...new Set(res.item.map((d) => d.slug))]
  } catch {
    /* fallback */
  }

  for (const slug of desaSlugs) {
    disallow.push(
      `/${slug}/dasbor/`,
      `/${slug}/kelola/`,
      `/${slug}/checkout`,
      `/${slug}/notifikasi`,
      `/${slug}/pesanan/`,
      `/${slug}/saya/`,
    )
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow,
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}

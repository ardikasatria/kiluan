import { getDaftarBerita } from '@/lib/api/berita'
import { cariDestinasi } from '@/lib/api/destinasi'
import { daftarDesaDiscovery } from '@/lib/api/discovery'
import { getDaftarPaket } from '@/lib/api/pasar'
import { DESA_DEFAULT, HALAMAN_PUBLIK_DESA } from '@/lib/kiluan/meta-halaman'
import { urlSitus } from '@/lib/kiluan/seo'
import type { MetadataRoute } from 'next'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlSitus()
  const sekarang = new Date()
  const entri: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: sekarang,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${base}/jelajah`,
      lastModified: sekarang,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  let desaSlugs: string[] = [DESA_DEFAULT]
  try {
    const res = await daftarDesaDiscovery({ batas: 50 })
    if (res.item.length) desaSlugs = [...new Set(res.item.map((d) => d.slug))]
  } catch {
    /* fallback DESA_DEFAULT */
  }

  for (const slug of desaSlugs) {
    entri.push({
      url: `${base}/${slug}`,
      lastModified: sekarang,
      changeFrequency: 'daily',
      priority: 0.9,
    })

    for (const hal of HALAMAN_PUBLIK_DESA) {
      entri.push({
        url: `${base}/${slug}${hal.path}`,
        lastModified: sekarang,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }

    try {
      const [berita, destinasi, paket] = await Promise.all([
        getDaftarBerita(slug, { batas: 100 }),
        cariDestinasi(slug, { batas: 100 }),
        getDaftarPaket(slug),
      ])

      for (const b of berita.item) {
        entri.push({
          url: `${base}/${slug}/berita/${b.slug}`,
          lastModified: b.terbit_pada ? new Date(b.terbit_pada) : sekarang,
          changeFrequency: 'monthly',
          priority: 0.6,
        })
      }

      for (const d of destinasi.item) {
        if (d.status !== 'publikasi') continue
        entri.push({
          url: `${base}/${slug}/spot/${d.slug}`,
          lastModified: sekarang,
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }

      for (const p of paket.item) {
        entri.push({
          url: `${base}/${slug}/paket/${p.slug}`,
          lastModified: sekarang,
          changeFrequency: 'weekly',
          priority: 0.75,
        })
      }
    } catch {
      /* lanjut desa berikutnya */
    }
  }

  return entri
}

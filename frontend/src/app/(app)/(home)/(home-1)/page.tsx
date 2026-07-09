import DiscoveryExplorer from '@/components/kiluan/DiscoveryExplorer'
import HomeCta from '@/components/kiluan/home/HomeCta'
import HomeFeaturedDesa from '@/components/kiluan/home/HomeFeaturedDesa'
import HomeHero from '@/components/kiluan/home/HomeHero'
import HomeModules from '@/components/kiluan/home/HomeModules'
import HomeValuePillars from '@/components/kiluan/home/HomeValuePillars'
import { cariDestinasiDiscovery, daftarDesaDiscovery } from '@/lib/api/discovery'
import { getKategori } from '@/lib/api/referensi'
import { MapIcon } from '@heroicons/react/24/outline'
import type { Metadata } from 'next'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'sigerciv — Platform Desa Wisata Regeneratif',
  description:
    'Platform desa wisata regeneratif berbasis komunitas. Temukan destinasi lintas desa, data milik Pokdarwis, dan etalase Teluk Kiluan.',
  openGraph: {
    title: 'sigerciv — Platform Desa Wisata Regeneratif',
    description: 'Wisata milik komunitas — bukan marketplace ekstraktif.',
    type: 'website',
  },
}

interface Props {
  searchParams: Promise<{ q?: string; tab?: string }>
}

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams
  const [destinasiRes, desaRes, kategori] = await Promise.all([
    cariDestinasiDiscovery({ batas: 12, q: sp.q }),
    daftarDesaDiscovery({ batas: 12 }),
    getKategori(),
  ])

  return (
    <div className="pb-20">
      <HomeHero />
      <HomeValuePillars />
      <HomeFeaturedDesa desa={desaRes.item} />
      <HomeModules />

      <section id="discovery" className="scroll-mt-24 border-t border-neutral-200 py-16 dark:border-neutral-800 sm:py-20">
        <div className="container">
          <div className="mb-8 max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
              <MapIcon className="size-4" aria-hidden />
              Modul Gerbang
            </p>
            <h2 className="mt-1 text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">
              Discovery multi-desa
            </h2>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Peta interaktif, filter kategori, pencarian keyset, dan jarak dari lokasi Anda — etalase publik
              destinasi &amp; profil desa aktif.
            </p>
          </div>

          <DiscoveryExplorer
            initialDestinasi={destinasiRes.item}
            initialDesa={desaRes.item}
            metaDestinasi={destinasiRes.meta}
            metaDesa={desaRes.meta}
            kategori={kategori}
            initialQ={sp.q ?? ''}
            initialTab={sp.tab === 'desa' ? 'desa' : 'destinasi'}
          />
        </div>
      </section>

      <HomeCta />
    </div>
  )
}

import DiscoveryExplorer from '@/components/kiluan/DiscoveryExplorer'
import HomeCategoryChips from '@/components/kiluan/home/HomeCategoryChips'
import HomeCta from '@/components/kiluan/home/HomeCta'
import HomeFeaturedSpots from '@/components/kiluan/home/HomeFeaturedSpots'
import HomeHero from '@/components/kiluan/home/HomeHero'
import HomeJejakRegeneratif from '@/components/kiluan/home/HomeJejakRegeneratif'
import HomeMisiLestari from '@/components/kiluan/home/HomeMisiLestari'
import HomePaketPilihan from '@/components/kiluan/home/HomePaketPilihan'
import HomePasarDesa from '@/components/kiluan/home/HomePasarDesa'
import HomeValuePillars from '@/components/kiluan/home/HomeValuePillars'
import HomeWeather from '@/components/kiluan/home/HomeWeather'
import { getCuacaDesa } from '@/lib/api/desa'
import { cariDestinasiDiscovery, daftarDesaDiscovery } from '@/lib/api/discovery'
import { getDaftarPaket, getDaftarUmkm } from '@/lib/api/pasar'
import { getKategori } from '@/lib/api/referensi'
import { MapIcon } from '@heroicons/react/24/outline'
import { buatMetadata } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'

const DESA = 'teluk-kiluan'

export const revalidate = 60

export const metadata: Metadata = buatMetadata({
  judul: 'sigerciv — Platform Desa Wisata Regeneratif',
  deskripsi:
    'Berwisata yang meninggalkan Kiluan lebih baik. Temukan destinasi, dukung UMKM lokal, dan ikut misi lestari di sigerciv.',
  path: '/',
  gambar: '/gallery/laguna.jpg',
})

interface Props {
  searchParams: Promise<{ q?: string; tab?: string; kategori?: string }>
}

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams
  const initialKategori = sp.kategori ? Number(sp.kategori) || undefined : undefined

  const [destinasiRes, desaRes, kategori, cuaca, umkmRes, paketRes] = await Promise.all([
    cariDestinasiDiscovery({ batas: 12, q: sp.q, kategori: initialKategori }),
    daftarDesaDiscovery({ batas: 12 }),
    getKategori(),
    getCuacaDesa(DESA),
    getDaftarUmkm(DESA, { batas: 12 }),
    getDaftarPaket(DESA),
  ])

  return (
    <div className="pb-20">
      <HomeHero />
      <HomeCategoryChips kategori={kategori} />
      <HomeFeaturedSpots destinasi={destinasiRes.item} kategori={kategori} />
      <HomeValuePillars />
      <HomeMisiLestari />
      <HomePasarDesa umkm={umkmRes.item} />
      <HomePaketPilihan paket={paketRes.item} />
      <HomeJejakRegeneratif />
      <HomeCta />

      <section id="discovery" className="scroll-mt-24 border-t border-neutral-200/70 py-16 dark:border-neutral-800/70 sm:py-20">
        <div className="container">
          <div className="mb-8 max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
              <MapIcon className="size-4" aria-hidden />
              Gerbang
            </p>
            <h2 className="mt-1 text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">
              Jelajah multi-desa
            </h2>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Peta interaktif, filter kategori, pencarian, dan jarak dari lokasi Anda — etalase publik destinasi
              &amp; profil desa aktif.
            </p>
          </div>

          <DiscoveryExplorer
            initialDestinasi={destinasiRes.item}
            initialDesa={desaRes.item}
            metaDestinasi={destinasiRes.meta}
            metaDesa={desaRes.meta}
            kategori={kategori}
            initialQ={sp.q ?? ''}
            initialTab="destinasi"
            initialKategoriId={initialKategori}
          />
        </div>
      </section>

      <HomeWeather cuaca={cuaca} />
    </div>
  )
}

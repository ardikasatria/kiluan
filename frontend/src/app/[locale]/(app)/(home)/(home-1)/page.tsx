import HomeJelajahCta from '@/components/kiluan/home/HomeJelajahCta'
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
import { cariDestinasiDiscovery } from '@/lib/api/discovery'
import { getDaftarPaket, getDaftarUmkm } from '@/lib/api/pasar'
import { getKategori } from '@/lib/api/referensi'
import { buatMetadata } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

const DESA = 'teluk-kiluan'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing.seo')
  return buatMetadata({
    judul: t('title'),
    deskripsi: t('description'),
    path: '/',
    gambar: '/gallery/laguna.jpg',
  })
}

export default async function HomePage() {
  const [destinasiRes, kategori, cuaca, umkmRes, paketRes] = await Promise.all([
    cariDestinasiDiscovery({ batas: 12 }),
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
      <HomeJelajahCta destinasi={destinasiRes.item} />
      <HomeCta />
      <HomeWeather cuaca={cuaca} />
    </div>
  )
}

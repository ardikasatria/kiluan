import KiluanMeshBackground from '@/components/kiluan/KiluanMeshBackground'
import JelajahExplorer from '@/components/kiluan/jelajah/JelajahExplorer'
import { cariDestinasiDiscovery, daftarDesaDiscovery } from '@/lib/api/discovery'
import { getProfilDesa, getTagDesa } from '@/lib/api/desa'
import { getKategori } from '@/lib/api/referensi'
import { buildJelajahHref, parseJelajahParams } from '@/lib/kiluan/jelajah-params'
import { buatMetadata } from '@/lib/kiluan/seo'
import { GlobeAltIcon } from '@heroicons/react/24/outline'
import type { Metadata } from 'next'

export const revalidate = 60

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const kategori = await getKategori()
  const params = parseJelajahParams(sp, kategori)

  let judul = 'Jelajah Desa Wisata Lampung'
  let deskripsi =
    'Temukan desa wisata regeneratif di Lampung — peta interaktif, filter kategori, dan destinasi lintas desa di Sigerciv.'

  if (params.desa) {
    const profil = await getProfilDesa(params.desa)
    if (profil) {
      judul = `Jelajah ${profil.nama}`
      deskripsi = `Destinasi dan wisata di ${profil.nama}, Lampung — etalase publik Sigerciv.`
    }
  } else if (params.q) {
    judul = `Cari "${params.q}" — Jelajah Lampung`
    deskripsi = `Hasil pencarian destinasi dan desa wisata untuk "${params.q}" di Sigerciv.`
  }

  return buatMetadata({
    judul,
    deskripsi,
    path: buildJelajahHref(params),
    gambar: '/gallery/laguna.jpg',
  })
}

export default async function JelajahPage({ searchParams }: Props) {
  const sp = await searchParams
  const kategori = await getKategori()
  const params = parseJelajahParams(sp, kategori)

  const [destinasiRes, desaRes, tagsDesa, profilDesa] = await Promise.all([
    cariDestinasiDiscovery({
      batas: 12,
      q: params.q,
      kategori: params.kategori,
      desa: params.desa,
      tag: params.desa ? params.tag : undefined,
      dekat: params.dekat,
      radius_m: params.dekat ? 50_000 : undefined,
    }),
    daftarDesaDiscovery({
      batas: 12,
      q: params.q,
      dekat: params.dekat,
      radius_m: params.dekat ? 100_000 : undefined,
    }),
    params.desa ? getTagDesa(params.desa) : Promise.resolve([]),
    params.desa ? getProfilDesa(params.desa) : Promise.resolve(null),
  ])

  return (
    <KiluanMeshBackground className="min-h-screen pb-20">
      <div className="border-b border-neutral-200/70 bg-gradient-to-br from-primary-800 via-primary-700 to-kiluan-teal text-white dark:border-neutral-800 dark:from-primary-950 dark:via-primary-900 dark:to-primary-800">
        <div className="container py-12 sm:py-16">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-100">
            <GlobeAltIcon className="size-4" aria-hidden />
            Sigerciv · Lampung
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Jelajah desa wisata</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-primary-50/90">
            Pilih desa di peta Lampung atau cari destinasi lintas desa — pariwisata regeneratif yang dimiliki
            komunitas.
          </p>
        </div>
      </div>

      <div className="container py-10 sm:py-12">
        <JelajahExplorer
          initialDestinasi={destinasiRes.item}
          initialDesa={desaRes.item}
          metaDestinasi={destinasiRes.meta}
          metaDesa={desaRes.meta}
          kategori={kategori}
          tagsDesa={tagsDesa}
          params={params}
          desaNama={profilDesa?.nama}
        />
      </div>
    </KiluanMeshBackground>
  )
}

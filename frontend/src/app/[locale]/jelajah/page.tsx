import JelajahExplorer from '@/components/kiluan/jelajah/JelajahExplorer'
import { cariDestinasiDiscovery, daftarDesaDiscovery } from '@/lib/api/discovery'
import { getProfilDesa, getTagDesa } from '@/lib/api/desa'
import { getKategori } from '@/lib/api/referensi'
import { buildJelajahHref, parseJelajahParams } from '@/lib/kiluan/jelajah-params'
import { buatMetadata } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
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
  const t = await getTranslations('jelajah.seo')

  let judul = t('defaultTitle')
  let deskripsi = t('defaultDescription')

  if (params.desa) {
    const profil = await getProfilDesa(params.desa)
    if (profil) {
      judul = t('villageTitle', { villageName: profil.nama })
      deskripsi = t('villageDescription', { villageName: profil.nama })
    }
  } else if (params.q) {
    judul = t('searchTitle', { query: params.q })
    deskripsi = t('searchDescription', { query: params.q })
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
  const t = await getTranslations('jelajah.hero')

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
    <div className="container py-8 sm:py-10">
      <section className="mb-8 overflow-hidden rounded-2xl border border-primary-700/25 bg-gradient-to-br from-primary-800 via-primary-700 to-kiluan-teal px-6 py-8 text-white shadow-sm sm:px-8 sm:py-10 dark:border-primary-800/50 dark:from-primary-950 dark:via-primary-900 dark:to-primary-800">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-100">
          <GlobeAltIcon className="size-4" aria-hidden />
          {t('badge')}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('title')}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-primary-100/90">{t('subtitle')}</p>
      </section>

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
  )
}

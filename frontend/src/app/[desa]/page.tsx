import DesaDestinasiExplorer from '@/components/kiluan/DesaDestinasiExplorer'
import DesaEtalaseHero from '@/components/kiluan/DesaEtalaseHero'
import DesaQuickLinks from '@/components/kiluan/DesaQuickLinks'
import { getCuacaDesa, getProfilDesa } from '@/lib/api/desa'
import { cariDestinasi } from '@/lib/api/destinasi'
import { getKategori } from '@/lib/api/referensi'
import { MapPinIcon } from '@heroicons/react/24/outline'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const revalidate = 60

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return {
    title: profil?.nama ?? desa,
    description: profil?.deskripsi ?? `Etalase wisata ${desa}`,
    openGraph: {
      title: profil?.nama ?? desa,
      description: profil?.deskripsi ?? undefined,
      type: 'website',
    },
  }
}

export default async function DesaEtalasePage({ params }: Props) {
  const { desa } = await params
  const [profil, hasil, cuaca, kategori] = await Promise.all([
    getProfilDesa(desa),
    cariDestinasi(desa, { batas: 12 }),
    getCuacaDesa(desa),
    getKategori(),
  ])

  if (!profil) notFound()

  return (
    <div className="pb-20">
      <DesaEtalaseHero
        profil={profil}
        desaSlug={desa}
        cuaca={cuaca}
        jumlahDestinasi={hasil.item.length}
      />
      <DesaQuickLinks desaSlug={desa} />

      <section id="destinasi" className="scroll-mt-24 py-14 sm:py-16">
        <div className="container">
          <div className="mb-8 max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
              <MapPinIcon className="size-4" aria-hidden />
              Modul Destinasi Kiluan
            </p>
            <h2 className="mt-1 text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">
              Katalog spot wisata
            </h2>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Destinasi terstruktur dengan geo, layanan, dan galeri — dikurasi pengelola desa.
            </p>
          </div>
          <DesaDestinasiExplorer
            desaSlug={desa}
            initial={hasil.item}
            meta={hasil.meta}
            kategori={kategori}
          />
        </div>
      </section>
    </div>
  )
}

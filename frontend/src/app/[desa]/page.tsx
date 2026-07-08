import DestinasiCard from '@/components/kiluan/DestinasiCard'
import WeatherWidget from '@/components/kiluan/WeatherWidget'
import { getCuacaDesa, getProfilDesa } from '@/lib/api/desa'
import { cariDestinasi } from '@/lib/api/destinasi'
import { MapPinIcon } from '@heroicons/react/24/outline'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  return {
    title: profil?.nama ?? desa,
    description: profil?.deskripsi ?? `Etalase wisata ${desa}`,
  }
}

export default async function DesaEtalasePage({ params }: Props) {
  const { desa } = await params
  const [profil, hasil, cuaca] = await Promise.all([
    getProfilDesa(desa),
    cariDestinasi(desa),
    getCuacaDesa(desa),
  ])

  if (!profil) notFound()

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 text-white dark:from-primary-900 dark:via-primary-800 dark:to-primary-700">
        <div className="container py-12 sm:py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-medium text-primary-100/90">Desa Wisata Regeneratif</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{profil.nama}</h1>
              {profil.deskripsi && (
                <p className="mt-4 max-w-xl text-base leading-relaxed text-primary-50/90 sm:text-lg">
                  {profil.deskripsi}
                </p>
              )}
              {(profil.pekon || profil.kabupaten) && (
                <p className="mt-4 flex items-center gap-2 text-sm text-primary-100">
                  <MapPinIcon className="size-4" />
                  {[profil.pekon, profil.kecamatan, profil.kabupaten, profil.provinsi].filter(Boolean).join(', ')}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#destinasi"
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary-800 hover:bg-primary-50"
                >
                  Jelajahi destinasi
                </a>
                <Link
                  href={`/${desa}/kelola`}
                  className="rounded-full border border-white/40 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
                >
                  Kelola desa
                </Link>
              </div>
            </div>
            <div className="lg:pl-4">
              <WeatherWidget cuaca={cuaca} />
            </div>
          </div>
        </div>
      </section>

      {/* Destinasi grid */}
      <section id="destinasi" className="container mt-12 sm:mt-16">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-primary-800 dark:text-primary-100">Destinasi</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Spot wisata yang sudah dipublikasikan pengelola desa.
            </p>
          </div>
        </div>

        {hasil.item.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 px-6 py-12 text-center text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
            Belum ada destinasi publik. Pengelola dapat menambahkan dari dashboard kelola.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hasil.item.map((d) => (
              <DestinasiCard key={d.id} desaSlug={desa} destinasi={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

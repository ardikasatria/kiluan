import SpotGallery from '@/components/kiluan/SpotGallery'
import SpotSimpanBar from '@/components/kiluan/simpanan/SpotSimpanBar'
import SpotMap from '@/components/kiluan/SpotMap'
import KontribusiSpotPanel from '@/components/kiluan/kontribusi/KontribusiSpotPanel'
import WeatherWidget from '@/components/kiluan/WeatherWidget'
import { getCuacaDesa } from '@/lib/api/desa'
import { getDestinasiDetail } from '@/lib/api/destinasi'
import { metadataDesa } from '@/lib/kiluan/seo'
import {
  ArrowLeftIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ComponentType, ReactNode } from 'react'

interface Props {
  params: Promise<{ desa: string; id: string }>
}

export const revalidate = 60

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, id } = await params
  const detail = await getDestinasiDetail(desa, id)
  const gambar = detail?.media?.[0]?.url
  return metadataDesa({
    judul: detail?.nama ?? 'Destinasi',
    desaSlug: desa,
    path: `/spot/${detail?.slug ?? id}`,
    deskripsi: detail?.deskripsi ?? undefined,
    gambar,
    tipe: 'article',
  })
}

function SectionHeading({ icon: Icon, children }: { icon: ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-semibold text-primary-800 dark:text-primary-100">
      <Icon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
      {children}
    </h2>
  )
}

export default async function SpotDetailPage({ params }: Props) {
  const { desa, id } = await params
  const [detail, cuaca] = await Promise.all([getDestinasiDetail(desa, id), getCuacaDesa(desa)])

  if (!detail || detail.status !== 'publikasi') notFound()

  return (
    <div className="pb-20">
      <div className="container pt-6">
        <Link
          href={`/${desa}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-600 dark:text-primary-300"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Kembali ke etalase
        </Link>
      </div>

      <div className="relative mt-4">
        <SpotGallery nama={detail.nama} media={detail.media} kategori={detail.kategori?.nama} />
      </div>

      <div className="container mt-10 grid gap-10 lg:grid-cols-3 lg:gap-12">
        <div className="space-y-8 lg:col-span-2">
          {detail.deskripsi && (
            <section>
              <SectionHeading icon={MapPinIcon}>Tentang spot</SectionHeading>
              <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">{detail.deskripsi}</p>
              {detail.alamat && (
                <p className="mt-3 flex items-start gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                  <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {detail.alamat}
                </p>
              )}
            </section>
          )}

          {detail.lokasi && (
            <section>
              <SectionHeading icon={MapPinIcon}>Lokasi</SectionHeading>
              <div className="mt-4">
                <SpotMap lokasi={detail.lokasi} nama={detail.nama} />
              </div>
            </section>
          )}

          {detail.layanan.length > 0 && (
            <section>
              <SectionHeading icon={BanknotesIcon}>Layanan</SectionHeading>
              <ul className="mt-4 space-y-3">
                {detail.layanan.map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-col justify-between gap-2 rounded-xl border border-neutral-200 p-4 sm:flex-row sm:items-center dark:border-neutral-700 dark:bg-neutral-800/40"
                  >
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{l.nama}</p>
                      <p className="text-sm text-neutral-500 capitalize dark:text-neutral-400">
                        {l.jenis.replace('_', ' ')}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-primary-700 dark:text-primary-300">
                      Rp {l.harga.toLocaleString('id-ID')}
                      <span className="text-xs font-normal text-neutral-500"> / {l.satuan_harga.replace('_', ' ')}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {detail.kalender.length > 0 && (
            <section>
              <SectionHeading icon={CalendarDaysIcon}>Jadwal aktivitas</SectionHeading>
              <ul className="mt-4 space-y-3">
                {detail.kalender.map((k) => (
                  <li
                    key={k.id}
                    className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700 dark:bg-neutral-800/40"
                  >
                    <ClockIcon className="mt-0.5 size-5 text-primary-600 dark:text-primary-400" aria-hidden />
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{k.judul}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {k.waktu_mulai} – {k.waktu_selesai} · {k.tipe}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
            <SpotSimpanBar destinasiId={detail.id} desaSlug={desa} nama={detail.nama} />
          </div>
          <WeatherWidget cuaca={cuaca} />
          <KontribusiSpotPanel desaSlug={desa} destinasiId={detail.id} destinasiNama={detail.nama} />
          {detail.tag.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                <TagIcon className="size-4 text-primary-600 dark:text-primary-400" aria-hidden />
                Tag
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {detail.tag.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-800 dark:bg-primary-900/50 dark:text-primary-200"
                  >
                    {t.nama}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

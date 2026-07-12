import { SertifikasiBadge } from '@/components/kiluan/pasar/ProdukCard'
import type { UmkmRingkas } from '@/lib/api/types'
import {
  ArrowRightIcon,
  BuildingStorefrontIcon,
  GlobeAsiaAustraliaIcon,
  SunIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

const DESA = 'teluk-kiluan'

const tingkatInfo = [
  {
    icon: SunIcon,
    nama: 'Tunas',
    body: 'Langkah awal praktik lestari — komitmen dasar keberlanjutan usaha.',
  },
  {
    icon: GlobeAsiaAustraliaIcon,
    nama: 'Bahari',
    body: 'Praktik bahari terukur — etika wisata laut dan kontribusi komunitas.',
  },
  {
    icon: TrophyIcon,
    nama: 'Lumba-Lumba',
    body: 'Tingkat tertinggi — standar regeneratif dan transparansi dampak.',
  },
]

interface Props {
  umkm: UmkmRingkas[]
}

function urutSertifikasi(a: UmkmRingkas, b: UmkmRingkas): number {
  const rank: Record<string, number> = { lumba_lumba: 3, bahari: 2, tunas: 1 }
  const ra = rank[a.sertifikasi?.tingkat ?? ''] ?? 0
  const rb = rank[b.sertifikasi?.tingkat ?? ''] ?? 0
  return rb - ra
}

export default function HomePasarDesa({ umkm }: Props) {
  const terverifikasi = umkm
    .filter((u) => u.status_verifikasi === 'terverifikasi')
    .sort(urutSertifikasi)
    .slice(0, 3)

  return (
    <section className="py-16 sm:py-20">
      <div className="container">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
            <BuildingStorefrontIcon className="size-4" aria-hidden />
            Pasar Desa
          </p>
          <h2 className="mt-1 text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">
            UMKM bersertifikat & produk lokal
          </h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Nilai ekonomi wisata mengalir ke penyedia lokal. Tingkat sertifikasi menandai komitmen lestari
            dari Tunas hingga Lumba-Lumba.
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {tingkatInfo.map(({ icon: Icon, nama, body }) => (
            <li
              key={nama}
              className="rounded-2xl border border-neutral-200 bg-white/80 p-5 dark:border-neutral-700 dark:bg-neutral-800/60"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-kiluan-mint">
                <Icon className="size-5" aria-hidden />
              </div>
              <h3 className="mt-3 font-semibold text-primary-800 dark:text-primary-100">{nama}</h3>
              <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">{body}</p>
            </li>
          ))}
        </ul>

        {terverifikasi.length > 0 ? (
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {terverifikasi.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/80 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-800/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-primary-800 dark:text-primary-100">{u.nama}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{u.bidang.nama}</p>
                </div>
                <SertifikasiBadge tingkat={u.sertifikasi?.tingkat} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 rounded-2xl border border-dashed border-primary-300/60 bg-primary-50/50 px-5 py-4 text-sm text-primary-800 dark:border-primary-600/40 dark:bg-primary-900/20 dark:text-primary-200">
            Katalog UMKM bersertifikat segera hadir — daftar sebagai penyedia lokal untuk ikut Pasar Desa.
          </p>
        )}

        <Link
          href={`/${DESA}/pasar`}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-600 dark:text-primary-300"
        >
          Jelajahi Pasar Desa
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  )
}

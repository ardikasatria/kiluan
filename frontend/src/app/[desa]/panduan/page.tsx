import { getProfilDesa } from '@/lib/api/desa'
import {
  ArrowLeftIcon,
  DevicePhoneMobileIcon,
  SignalSlashIcon,
  SunIcon,
} from '@heroicons/react/24/outline'
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
    title: profil ? `Panduan berkunjung ${profil.nama}` : 'Panduan berkunjung',
  }
}

const tips = [
  {
    icon: SunIcon,
    title: 'Waktu terbaik lumba-lumba',
    body: 'Aktivitas lumba-lumba pagi biasanya 05:30–07:00. Datang lebih awal ke dermaga dan hormati jarak aman — jangan mengejar atau menyentuh.',
  },
  {
    icon: SignalSlashIcon,
    title: 'Siapkan mode offline',
    body: 'Sinyal di Teluk Kiluan terbatas. Pasang Kiluan sebagai PWA dan buka halaman destinasi saat masih online agar konten tersimpan untuk dibaca tanpa jaringan.',
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Pasang PWA di HP',
    body: 'Android: tombol Install / Tambah ke Layar Utama di Chrome. iOS: Share → Add to Home Screen di Safari. Aplikasi terbuka layar penuh tanpa Play Store.',
  },
]

export default async function PanduanDesaPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <div className="pb-20">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-primary-800 to-primary-700 text-white dark:from-primary-950 dark:to-primary-900">
        <div className="container py-10 sm:py-12">
          <Link
            href={`/${desa}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-100 hover:text-white"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            Kembali ke etalase
          </Link>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Panduan berkunjung {profil.nama}</h1>
          <p className="mt-3 max-w-2xl text-primary-50/90">
            Etika bahari, kesiapan offline, dan cara memasang Kiluan di perangkat Anda.
          </p>
        </div>
      </div>

      <div className="container py-12 sm:py-16">
        <ul className="grid gap-6 lg:grid-cols-3">
          {tips.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/60"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                <Icon className="size-6" aria-hidden />
              </div>
              <h2 className="mt-4 font-semibold text-primary-800 dark:text-primary-100">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{body}</p>
            </li>
          ))}
        </ul>

        <section className="mt-12 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8 dark:border-neutral-700 dark:bg-neutral-900/40">
          <h2 className="text-lg font-semibold text-primary-800 dark:text-primary-100">Kode etik regeneratif</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
            <li>Jangan sentuh atau injak terumbu karang; gunakan sunscreen ramah laut.</li>
            <li>Bawa pulang sampah plastik — tidak ada trash bin di banyak spot bahari.</li>
            <li>Patuhi kuota &amp; jadwal spot; hormati daya dukung yang ditetapkan pengelola.</li>
            <li>Transaksi langsung ke penyedia lokal mendukung ekonomi komunitas.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

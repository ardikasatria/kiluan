import {
  ArrowPathIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

const pillars = [
  {
    icon: ShieldCheckIcon,
    title: 'Data milik desa',
    body: 'Inventori spot, layanan, dan media dikurasi komunitas. Platform hanya penatalayan — bukan pemilik data seperti OTA.',
  },
  {
    icon: UserGroupIcon,
    title: 'Nilai untuk lokal',
    body: 'Transaksi langsung ke penyedia UMKM & agen lokal. Porsi reinvestment mengalir ke dana konservasi desa.',
  },
  {
    icon: ArrowPathIcon,
    title: 'Loop regeneratif',
    body: 'Misi Kiluan, kartu aksi owner, dan monitoring ekologi membentuk flywheel: belajar → beraksi → terukur.',
  },
  {
    icon: ChartBarIcon,
    title: 'Sukses = GMV + lestari',
    body: 'Daya dukung spot, distribusi pendapatan, dan Neraca Regeneratif jadi KPI setara volume kunjungan.',
  },
]

export default function HomeValuePillars() {
  return (
    <section className="border-b border-neutral-200 bg-neutral-50 py-16 dark:border-neutral-800 dark:bg-neutral-900/50 sm:py-20">
      <div className="container">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">
            Bukan Traveloka — platform regeneratif berbasis komunitas
          </h2>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">
            Tiga pembeda struktural dari blueprint Kiluan: kepemilikan data, aliran nilai lokal, dan metrik
            lestari sebagai bagian inti domain model.
          </p>
        </div>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/60"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                <Icon className="size-6" aria-hidden />
              </div>
              <h3 className="mt-4 font-semibold text-primary-800 dark:text-primary-100">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

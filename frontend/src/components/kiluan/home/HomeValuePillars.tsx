import { BanknotesIcon, ShieldCheckIcon, UserGroupIcon } from '@heroicons/react/24/outline'

const pillars = [
  {
    icon: ShieldCheckIcon,
    title: 'Data milik desa',
    body: 'Inventori spot, layanan, dan media dikurasi komunitas. Platform hanya penatalayan — data tetap milik desa & Pokdarwis.',
  },
  {
    icon: UserGroupIcon,
    title: 'Nilai kembali ke warga',
    body: 'Transaksi mengalir ke penyedia UMKM dan agen lokal. Porsi reinvestment dialokasikan untuk dana konservasi desa.',
  },
  {
    icon: BanknotesIcon,
    title: 'Dana konservasi transparan',
    body: 'Komitmen mempublikasikan aliran dana lestari setelah data terverifikasi — tanpa klaim angka sebelum siap.',
  },
]

export default function HomeValuePillars() {
  return (
    <section className="border-b border-neutral-200/70 bg-white/35 py-16 backdrop-blur-sm dark:border-neutral-800/70 dark:bg-neutral-900/25 sm:py-20">
      <div className="container">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">Kenapa sigerciv</h2>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">
            Tiga pilar wisata regeneratif: kepemilikan data komunitas, aliran nilai lokal, dan transparansi
            konservasi.
          </p>
        </div>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/60"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-kiluan-mint/25 text-primary-700 dark:bg-primary-900/50 dark:text-kiluan-mint">
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

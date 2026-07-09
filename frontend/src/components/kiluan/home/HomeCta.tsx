import { ArrowRightIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function HomeCta() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 px-6 py-12 sm:px-10 sm:py-14 dark:from-primary-950 dark:via-primary-900 dark:to-primary-800">
          <div className="absolute -top-20 -right-16 size-64 rounded-full bg-kiluan-mint/15 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-100">
                <DevicePhoneMobileIcon className="size-4" aria-hidden />
                PWA dapat di-install
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                Gabung sebagai warga digital Teluk Kiluan
              </h2>
              <p className="mt-3 text-primary-50/90">
                Pasang sigerciv di layar utama HP Anda — konten etalase tetap bisa dibaca saat sinyal terbatas.
                Daftar untuk kontribusi data, kelola destinasi, atau mulai sebagai wisatawan.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/daftar"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary-800 hover:bg-primary-50"
              >
                Daftar akun
                <ArrowRightIcon className="size-4" aria-hidden />
              </Link>
              <Link
                href="/masuk"
                className="inline-flex items-center gap-2 rounded-full border border-white/35 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Masuk
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

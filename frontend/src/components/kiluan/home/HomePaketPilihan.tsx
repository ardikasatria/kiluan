import PaketCard from '@/components/kiluan/pasar/PaketCard'
import type { PaketRingkas } from '@/lib/api/types'
import { ArrowRightIcon, TicketIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

const DESA = 'teluk-kiluan'

interface Props {
  paket: PaketRingkas[]
}

export default function HomePaketPilihan({ paket }: Props) {
  const publik = paket.filter((p) => p.status === 'publikasi').slice(0, 3)

  return (
    <section className="border-t border-neutral-200/70 py-16 dark:border-neutral-800/70 sm:py-20">
      <div className="container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
              <TicketIcon className="size-4" aria-hidden />
              Pengalaman
            </p>
            <h2 className="mt-1 text-2xl font-bold text-primary-800 sm:text-3xl dark:text-primary-100">
              Paket & pengalaman pilihan
            </h2>
            <p className="mt-2 max-w-xl text-neutral-600 dark:text-neutral-400">
              Paket wisata kurasi komunitas — agen lokal, jadwal fleksibel, nilai kembali ke desa.
            </p>
          </div>
          {publik.length > 0 && (
            <Link
              href="/jelajah?lensa=wisata"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-300"
            >
              Jelajah paket
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
          )}
        </div>

        {publik.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {publik.map((p) => (
              <PaketCard key={p.id} paket={p} desaSlug={DESA} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-primary-300/60 bg-primary-50/50 px-6 py-10 text-center dark:border-primary-600/40 dark:bg-primary-900/20">
            <p className="text-lg font-semibold text-primary-800 dark:text-primary-100">Paket wisata — segera</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
              Kurasi paket bahari dan pengalaman lokal sedang disiapkan bersama agen & Pokdarwis di jaringan desa wisata Sigerciv.
            </p>
            <Link
              href="/jelajah?lensa=wisata"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary-300 px-5 py-2.5 text-sm font-semibold text-primary-800 hover:bg-white dark:border-primary-600 dark:text-primary-100 dark:hover:bg-primary-900/40"
            >
              Jelajah paket di Lampung
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

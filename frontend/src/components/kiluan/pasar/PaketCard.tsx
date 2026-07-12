import SimpanTombol from '@/components/kiluan/simpanan/SimpanTombol'
import { formatHarga } from '@/lib/kiluan/pasar'
import type { PaketRingkas } from '@/lib/api/types'
import Link from 'next/link'

interface Props {
  paket: PaketRingkas
  desaSlug: string
}

export default function PaketCard({ paket, desaSlug }: Props) {
  const href = `/${desaSlug}/paket/${paket.slug || paket.id}`

  return (
    <article className="relative flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900/40">
      <SimpanTombol
        tipe="paket"
        entitasId={paket.id}
        desaSlug={desaSlug}
        size="sm"
        className="absolute top-4 right-4"
        onParentClick={false}
      />
      <p className="text-xs font-medium text-primary-600 dark:text-primary-400">{paket.agen.nama}</p>
      <h3 className="mt-1 font-semibold text-primary-800 dark:text-primary-100">{paket.nama}</h3>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {paket.durasi_jam} jam · kuota default {paket.kuota_default} orang
      </p>
      <p className="mt-4 text-lg font-bold text-kiluan-sea dark:text-kiluan-mint">
        {formatHarga(paket.harga, paket.satuan_harga)}
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex justify-center rounded-full bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-800"
      >
        Pilih jadwal & pesan
      </Link>
    </article>
  )
}

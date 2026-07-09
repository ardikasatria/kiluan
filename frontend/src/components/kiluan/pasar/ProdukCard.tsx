import { formatHarga, labelSertifikasi } from '@/lib/kiluan/pasar'
import { tambahKeKeranjang } from '@/lib/kiluan/cart'
import type { ProdukJasaItem } from '@/lib/api/types'
import Link from 'next/link'

interface Props {
  produk: ProdukJasaItem
  desaSlug: string
}

export default function ProdukCard({ produk, desaSlug }: Props) {
  return (
    <article className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-primary-600 dark:text-primary-400">{produk.umkm.nama}</p>
          <h3 className="mt-1 font-semibold text-primary-800 dark:text-primary-100">{produk.nama}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs capitalize text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {produk.jenis}
        </span>
      </div>
      {produk.deskripsi && (
        <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{produk.deskripsi}</p>
      )}
      <div className="mt-4 flex items-end justify-between gap-2">
        <p className="text-lg font-bold text-kiluan-sea dark:text-kiluan-mint">
          {formatHarga(produk.harga, produk.satuan_harga)}
        </p>
        {produk.stok != null && (
          <p className="text-xs text-neutral-500">Stok {produk.stok}</p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            tambahKeKeranjang(desaSlug, {
              item_tipe: 'produk_jasa',
              item_id: produk.id,
              nama: produk.nama,
              harga: produk.harga,
              jumlah: 1,
            })
          }
          className="text-sm font-medium text-white rounded-full bg-primary-700 px-4 py-1.5 hover:bg-primary-800"
        >
          + Keranjang
        </button>
        <Link
          href={`/${desaSlug}/pasar?umkm=${produk.umkm.id}`}
          className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Lihat UMKM
        </Link>
        <Link
          href={`/${desaSlug}/checkout`}
          className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Checkout
        </Link>
      </div>
    </article>
  )
}

export function SertifikasiBadge({ tingkat }: { tingkat?: string | null }) {
  const label = labelSertifikasi(tingkat)
  if (!label) return null
  return (
    <span className="inline-flex rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-800 ring-1 ring-primary-200 dark:bg-primary-900/40 dark:text-primary-100">
      {label}
    </span>
  )
}

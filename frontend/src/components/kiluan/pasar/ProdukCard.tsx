'use client'

import SimpanTombol from '@/components/kiluan/simpanan/SimpanTombol'
import TingkatSertifikasi from '@/components/kiluan/pasar/TingkatSertifikasi'
import { Link } from '@/i18n/navigation'
import { urlSampulDariMedia } from '@/lib/api/media'
import type { ProdukJasaItem } from '@/lib/api/types'
import { tambahKeKeranjang } from '@/lib/kiluan/cart'
import { formatHarga } from '@/lib/kiluan/pasar'
import { PhotoIcon, ShoppingBagIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'

interface Props {
  produk: ProdukJasaItem
  desaSlug: string
}

export default function ProdukCard({ produk, desaSlug }: Props) {
  const t = useTranslations('pasar.card')
  const locale = useLocale()
  const localeTag = locale === 'en' ? 'en-ID' : 'id-ID'
  const sampul = urlSampulDariMedia(produk.media ?? [])
  const detailHref = `/${desaSlug}/pasar/produk/${produk.id}`

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:border-primary-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900/50 dark:hover:border-primary-600">
      <Link href={detailHref} className="relative block aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {sampul ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sampul}
            alt={produk.nama}
            className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-neutral-300 dark:text-neutral-600">
            <PhotoIcon className="size-10" aria-hidden />
          </span>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium capitalize text-neutral-700 shadow-sm backdrop-blur-sm dark:bg-neutral-900/80 dark:text-neutral-200">
          {produk.jenis}
        </span>
        <span className="absolute top-2 right-2">
          <SimpanTombol tipe="produk" entitasId={produk.id} desaSlug={desaSlug} size="sm" />
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-xs font-medium text-primary-600 dark:text-primary-400">{produk.umkm.nama}</p>
        <h3 className="mt-1 font-semibold text-primary-800 dark:text-primary-100">
          <Link href={detailHref} className="hover:underline">
            {produk.nama}
          </Link>
        </h3>
        {produk.deskripsi && (
          <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{produk.deskripsi}</p>
        )}
        <div className="mt-4 flex items-end justify-between gap-2">
          <p className="text-lg font-bold text-kiluan-sea dark:text-kiluan-mint">
            {formatHarga(produk.harga, produk.satuan_harga, localeTag)}
          </p>
          {produk.stok != null && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('stock', { count: produk.stok })}</p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
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
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-700 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none dark:bg-primary-600 dark:hover:bg-primary-500"
          >
            <ShoppingBagIcon className="size-4" aria-hidden />
            {t('cart')}
          </button>
          <Link
            href={detailHref}
            className="inline-flex items-center rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-primary-400 hover:text-primary-700 dark:border-neutral-600 dark:text-neutral-300 dark:hover:border-primary-500 dark:hover:text-primary-300"
          >
            {t('detail')}
          </Link>
        </div>
      </div>
    </article>
  )
}

/** @deprecated gunakan `TingkatSertifikasi`. Dipertahankan untuk kompatibilitas impor lama. */
export function SertifikasiBadge({ tingkat }: { tingkat?: string | null }) {
  return <TingkatSertifikasi tingkat={tingkat} />
}

import type { BeritaRingkas } from '@/lib/api/types'
import { labelKategoriBerita } from '@/lib/kiluan/berita'
import { formatTanggal } from '@/lib/kiluan/lencana'
import { NewspaperIcon, StarIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop'

interface Props {
  berita: BeritaRingkas
  desaSlug: string
  featured?: boolean
}

export default function BeritaCard({ berita, desaSlug, featured }: Props) {
  const href = `/${desaSlug}/berita/${berita.slug}`
  const sampul = berita.sampul?.url
  const punyaFoto = Boolean(sampul)

  return (
    <Link
      href={href}
      className={clsx(
        'group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:border-primary-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:border-primary-600',
        featured && 'sm:flex-row sm:items-stretch',
      )}
    >
      <div
        className={clsx(
          'relative overflow-hidden bg-neutral-100 dark:bg-neutral-900',
          featured ? 'aspect-[16/9] sm:aspect-auto sm:w-2/5 sm:min-h-[220px]' : 'aspect-[16/10]',
        )}
      >
        {punyaFoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sampul!}
            alt={berita.judul}
            className="size-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <Image
            src={PLACEHOLDER}
            alt={berita.judul}
            fill
            className="object-cover opacity-90 transition duration-300 group-hover:scale-105 dark:opacity-75"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
        <span className="absolute top-3 left-3 rounded-full bg-primary-800/90 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm dark:bg-primary-900/90">
          {labelKategoriBerita(berita.kategori)}
        </span>
        {berita.sorotan && (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <StarIcon className="size-3.5" aria-hidden />
            Sorotan
          </span>
        )}
        <div className="absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-lg bg-black/30 text-white backdrop-blur-sm">
          <NewspaperIcon className="size-4" aria-hidden />
        </div>
      </div>
      <div className={clsx('flex flex-1 flex-col p-4 sm:p-5', featured && 'sm:justify-center')}>
        <h3
          className={clsx(
            'font-semibold text-primary-800 group-hover:text-primary-600 dark:text-primary-100 dark:group-hover:text-primary-300',
            featured ? 'text-xl sm:text-2xl' : 'text-lg',
          )}
        >
          {berita.judul}
        </h3>
        {berita.ringkasan && (
          <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{berita.ringkasan}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs text-neutral-500 dark:text-neutral-400">
          <span>{berita.penulis.nama}</span>
          {berita.terbit_pada && <span>{formatTanggal(berita.terbit_pada)}</span>}
        </div>
        {berita.tag.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {berita.tag.map((t) => (
              <span
                key={t.id}
                className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700 dark:bg-primary-900/40 dark:text-primary-200"
              >
                #{t.nama}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

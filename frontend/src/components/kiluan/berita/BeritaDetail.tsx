import type { BeritaDetail as BeritaDetailType } from '@/lib/api/types'
import { Link } from '@/i18n/navigation'
import { labelKategoriBerita, renderMarkdownSederhana } from '@/lib/kiluan/berita'
import { formatTanggal } from '@/lib/kiluan/lencana'
import { ArrowLeftIcon, StarIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop'

interface Props {
  berita: BeritaDetailType
  desaSlug: string
  desaNama?: string
}

export default async function BeritaDetail({ berita, desaSlug, desaNama }: Props) {
  const t = await getTranslations('berita')
  const tr = t as unknown as (key: string) => string
  const sampul = berita.sampul?.url

  return (
    <article className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-kiluan-mint/30 via-primary-50 to-white dark:from-primary-950 dark:via-primary-900 dark:to-neutral-950">
        <div className="container py-8 sm:py-12">
          <Link
            href={`/${desaSlug}/berita`}
            className="inline-flex items-center gap-2 text-sm text-primary-700 hover:underline dark:text-primary-300"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            {t('back')}
          </Link>
          {desaNama && (
            <p className="mt-4 text-sm font-medium text-primary-600 dark:text-primary-400">{desaNama}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-800 dark:bg-primary-900/50 dark:text-primary-200">
              {labelKategoriBerita(berita.kategori, tr)}
            </span>
            {berita.sorotan && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                <StarIcon className="size-3.5" aria-hidden />
                {t('featured')}
              </span>
            )}
          </div>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-primary-800 sm:text-4xl dark:text-primary-100">
            {berita.judul}
          </h1>
          {berita.ringkasan && (
            <p className="mt-3 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">{berita.ringkasan}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <UserCircleIcon className="size-5" aria-hidden />
              {berita.penulis.nama}
            </span>
            {berita.terbit_pada && <time dateTime={berita.terbit_pada}>{formatTanggal(berita.terbit_pada)}</time>}
          </div>
        </div>
      </div>

      <div className="container py-8 sm:py-10">
        <div className="mx-auto max-w-3xl">
          {sampul ? (
            <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sampul} alt={berita.judul} className="size-full object-cover" />
            </div>
          ) : (
            <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl">
              <Image src={PLACEHOLDER} alt={berita.judul} fill className="object-cover dark:opacity-80" priority />
            </div>
          )}

          {berita.tag.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {berita.tag.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border border-primary-200 px-3 py-1 text-xs text-primary-700 dark:border-primary-700 dark:text-primary-300"
                >
                  #{tag.nama}
                </span>
              ))}
            </div>
          )}

          <div
            className="prose prose-neutral max-w-none dark:prose-invert prose-headings:text-primary-800 dark:prose-headings:text-primary-100 prose-a:text-primary-600 dark:prose-a:text-primary-400"
            dangerouslySetInnerHTML={{ __html: renderMarkdownSederhana(berita.konten) }}
          />
        </div>
      </div>
    </article>
  )
}

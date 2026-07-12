'use client'

import { Link } from '@/i18n/navigation'
import SimpanTombol from '@/components/kiluan/simpanan/SimpanTombol'
import type { MisiRingkas } from '@/lib/api/types'
import { misiAksiTerkunci } from '@/lib/kiluan/penjelajah'
import { AcademicCapIcon, LockClosedIcon, MapPinIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'

interface Props {
  misi: MisiRingkas
  desaSlug: string
  katUnlock: Set<string>
  labelKategori: (k: string) => string
}

export default function MisiCard({ misi, desaSlug, katUnlock, labelKategori }: Props) {
  const t = useTranslations('misi')
  const terkunci = misiAksiTerkunci(misi, katUnlock)

  return (
    <article
      className={clsx(
        'relative rounded-2xl border bg-white shadow-sm transition dark:bg-neutral-900',
        terkunci
          ? 'border-neutral-200 opacity-90 dark:border-neutral-700'
          : 'border-neutral-200 hover:border-primary-300 dark:border-neutral-700 dark:hover:border-primary-600',
      )}
    >
      <SimpanTombol
        tipe="misi"
        entitasId={misi.id}
        desaSlug={desaSlug}
        size="sm"
        className="absolute top-3 right-3 z-10"
        onParentClick={false}
      />
      <Link
        href={`/${desaSlug}/misi/${misi.id}`}
        className="block p-5"
        aria-disabled={terkunci}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={clsx(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
              misi.jenis === 'belajar'
                ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
            )}
          >
            {misi.jenis === 'belajar' ? (
              <AcademicCapIcon className="size-3.5" />
            ) : (
              <MapPinIcon className="size-3.5" />
            )}
            {t(`jenis.${misi.jenis}`)}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">{labelKategori(misi.kategori)}</span>
        </div>

        <h2 className="mt-2 font-semibold text-neutral-900 dark:text-neutral-100">{misi.judul}</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('poin', { count: misi.poin })}</p>

        {misi.stasiun && (
          <p className="mt-2 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            <MapPinIcon className="size-3.5 shrink-0" />
            {misi.stasiun.nama}
          </p>
        )}

        {terkunci && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
            <LockClosedIcon className="size-4 shrink-0" />
            {t('belajarDulu')}
          </p>
        )}
      </Link>
    </article>
  )
}

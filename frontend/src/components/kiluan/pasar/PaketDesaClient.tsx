'use client'

import PaketCard from '@/components/kiluan/pasar/PaketCard'
import { Link } from '@/i18n/navigation'
import { getDaftarPaket } from '@/lib/api/pasar'
import type { PaketRingkas } from '@/lib/api/types'
import {
  filterPaketDurasi,
  labelDurasiFilter,
  OPSI_DURASI_PAKET,
  parseDurasiFilter,
  type DurasiFilter,
} from '@/lib/kiluan/paket'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function PaketDesaClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('paket')
  const searchParams = useSearchParams()
  const durasi = parseDurasiFilter(searchParams.get('durasi'))
  const [semua, setSemua] = useState<PaketRingkas[]>([])
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getDaftarPaket(desaSlug)
      setSemua(res.item.filter((p) => p.status === 'publikasi'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  const paket = useMemo(() => filterPaketDurasi(semua, durasi), [semua, durasi])
  const tr = t as unknown as (key: string) => string
  const labelAktif = labelDurasiFilter(durasi, tr)

  function hrefDurasi(param: DurasiFilter | null) {
    const base = `/${desaSlug}/paket`
    return param ? `${base}?durasi=${param}` : base
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-kiluan-sea/15 via-primary-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10 sm:py-12">
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary-800 dark:text-primary-100">
            {t('title')}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
        </div>
      </div>

      <div className="container py-10">
        <div className="flex flex-wrap gap-2">
          {OPSI_DURASI_PAKET.map((o) => {
            const aktif = durasi === o.param
            return (
              <Link
                key={o.kode}
                href={hrefDurasi(o.param)}
                className={clsx(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition',
                  aktif
                    ? 'bg-primary-700 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300',
                )}
              >
                {t(`durasi.${o.kode}`)}
              </Link>
            )
          })}
        </div>

        {labelAktif && (
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            {t('showing')}{' '}
            <span className="font-medium text-primary-800 dark:text-primary-100">{labelAktif}</span>
            {paket.length > 0 && ` ${t('paketCount', { count: paket.length })}`}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-neutral-500">{t('loadingList')}</p>
        ) : paket.length === 0 ? (
          <p className="mt-8 text-sm text-neutral-500">
            {durasi ? t('emptyFiltered') : t('emptyAll')}
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {paket.map((p) => (
              <PaketCard key={p.id} paket={p} desaSlug={desaSlug} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import KontribusiForm from '@/components/kiluan/kontribusi/KontribusiForm'
import PoinRingkas from '@/components/kiluan/lencana/PoinRingkas'
import { Link } from '@/i18n/navigation'
import { getKontribusiSaya } from '@/lib/api/kontribusi'
import { getPoinSaya } from '@/lib/api/lencana'
import type { KontribusiItem } from '@/lib/api/types'
import {
  labelStatusKontribusi,
  labelTipeKontribusi,
  ringkasanMuatan,
  warnaStatusKontribusi,
} from '@/lib/kiluan/kontribusi'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function KontribusiSayaClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('kontribusi')
  const tr = t as unknown as (key: string) => string
  const [item, setItem] = useState<KontribusiItem[]>([])
  const [saldo, setSaldo] = useState(0)
  const [revisi, setRevisi] = useState<KontribusiItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [formBuka, setFormBuka] = useState(false)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const [k, p] = await Promise.all([
        getKontribusiSaya(desaSlug),
        getPoinSaya(desaSlug, { batas: 1 }),
      ])
      setItem(k.item)
      setSaldo(p.saldo)
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-primary-800 via-primary-700 to-kiluan-teal text-white">
        <div className="container py-10 sm:py-12">
          <Link href={`/${desaSlug}/dasbor`} className="inline-flex items-center gap-2 text-sm text-primary-100 hover:text-white">
            <ArrowLeftIcon className="size-4" /> {t('backDasbor')}
          </Link>
          <h1 className="mt-4 text-3xl font-bold">{t('title')}</h1>
          <p className="mt-2 text-sm text-primary-100/90">{desaNama}</p>
          <div className="mt-4">
            <PoinRingkas saldo={saldo} desaSlug={desaSlug} className="!text-white" />
          </div>
        </div>
      </div>

      <div className="container py-8 sm:py-10">
        {!formBuka && !revisi && (
          <button
            type="button"
            onClick={() => setFormBuka(true)}
            className="mb-6 rounded-full bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600"
          >
            {t('new')}
          </button>
        )}

        {(formBuka || revisi) && (
          <KontribusiForm
            desaSlug={desaSlug}
            kontribusiRevisi={revisi}
            onBerhasil={() => {
              setFormBuka(false)
              setRevisi(null)
              void muat()
            }}
            className="mb-8"
          />
        )}

        {loading ? (
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        ) : item.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('empty')}</p>
        ) : (
          <ul className="space-y-3">
            {item.map((k) => (
              <li key={k.id} className="rounded-2xl border border-neutral-200 px-4 py-4 dark:border-neutral-700">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-primary-800 dark:text-primary-100">
                      {labelTipeKontribusi(k.tipe, tr)}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                      {ringkasanMuatan(k, tr)}
                    </p>
                  </div>
                  <span className={clsx('rounded-full px-2 py-0.5 text-xs ring-1', warnaStatusKontribusi(k.status))}>
                    {labelStatusKontribusi(k.status, tr)}
                  </span>
                </div>
                {k.status === 'revisi' && (
                  <button
                    type="button"
                    onClick={() => {
                      setRevisi(k)
                      setFormBuka(false)
                    }}
                    className="mt-3 text-sm font-medium text-primary-600 hover:underline"
                  >
                    {t('revisi')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

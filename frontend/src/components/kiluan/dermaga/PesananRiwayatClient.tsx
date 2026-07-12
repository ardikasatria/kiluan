'use client'

import { daftarPesananSaya } from '@/lib/api/dermaga'
import { pesanGalat } from '@/lib/api/galat'
import type { PesananRingkas } from '@/lib/api/types'
import { formatHarga } from '@/lib/kiluan/pasar'
import { formatTanggal } from '@/lib/kiluan/lencana'
import { ClipboardDocumentListIcon, ShoppingBagIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { Link } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

const cardClass =
  'rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-900/50 dark:hover:border-primary-700'

function badgeStatus(status: string) {
  return clsx(
    'rounded-full px-2.5 py-0.5 text-xs font-medium',
    status === 'menunggu_pembayaran' && 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
    status === 'dibayar' && 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
    status === 'diproses' && 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200',
    status === 'selesai' && 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200',
    ['dibatalkan', 'kedaluwarsa'].includes(status) && 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
    status === 'refund_diajukan' && 'bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200',
    !['menunggu_pembayaran', 'dibayar', 'diproses', 'selesai', 'dibatalkan', 'kedaluwarsa', 'refund_diajukan'].includes(
      status,
    ) && 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  )
}

export default function PesananRiwayatClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('pesanan')
  const locale = useLocale()
  const localeTag = locale === 'en' ? 'en-US' : 'id-ID'
  const tStatus = t as unknown as (key: string) => string
  const [pesanan, setPesanan] = useState<PesananRingkas[]>([])
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)

  const labelStatus = (status: string) => {
    try {
      return tStatus(`status.${status}`)
    } catch {
      return status.replace(/_/g, ' ')
    }
  }

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const res = await daftarPesananSaya(desaSlug)
      setPesanan(
        [...res.item].sort(
          (a, b) => new Date(b.dibuat_pada).getTime() - new Date(a.dibuat_pada).getTime(),
        ),
      )
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  return (
    <div className="pb-20">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-kiluan-sea/15 via-primary-50 to-white dark:border-neutral-800 dark:from-neutral-950 dark:via-primary-950/60 dark:to-neutral-900">
        <div className="container py-10 sm:py-12">
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary-800 dark:text-primary-100">
            {t('riwayat.title')}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">{t('riwayat.subtitle')}</p>
        </div>
      </div>

      <div className="container py-10">
        {galat && (
          <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
            {galat}
          </p>
        )}

        {loading ? (
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
        ) : pesanan.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-600">
            <ShoppingBagIcon className="mx-auto size-12 text-neutral-300 dark:text-neutral-600" aria-hidden />
            <p className="mt-4 text-neutral-600 dark:text-neutral-400">{t('riwayat.empty')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
              <Link
                href={`/${desaSlug}/paket`}
                className="font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                {t('riwayat.linkPaket')}
              </Link>
              <Link
                href={`/${desaSlug}/pasar`}
                className="font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                {t('riwayat.linkPasar')}
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-4">
            {pesanan.map((p) => {
              const itemCount = p.item?.length ?? 0
              const ringkas = p.item?.[0]?.nama_snapshot
              return (
                <li key={p.id}>
                  <Link href={`/${desaSlug}/pesanan/${p.id}`} className={clsx(cardClass, 'block')}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <ClipboardDocumentListIcon
                            className="size-4 shrink-0 text-primary-600 dark:text-primary-400"
                            aria-hidden
                          />
                          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{p.kode_pesanan}</p>
                        </div>
                        {ringkas && (
                          <p className="mt-1 truncate text-sm text-neutral-600 dark:text-neutral-400">
                            {ringkas}
                            {itemCount > 1 && ` · ${t('riwayat.itemCount', { count: itemCount })}`}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                          {formatTanggal(p.dibuat_pada, localeTag)}
                        </p>
                      </div>
                      <div className="text-end">
                        <span className={badgeStatus(p.status)}>{labelStatus(p.status)}</span>
                        <p className="mt-2 font-semibold text-neutral-900 dark:text-neutral-100">
                          {formatHarga(p.total, 'per_paket')}
                        </p>
                        <p className="mt-1 text-xs font-medium text-primary-600 dark:text-primary-400">
                          {t('riwayat.detail')} →
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

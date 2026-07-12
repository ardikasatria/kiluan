'use client'

import { SertifikasiBadge } from '@/components/kiluan/pasar/ProdukCard'
import { getDaftarUmkm } from '@/lib/api/pasar'
import { getSertifikasi } from '@/lib/api/naik-kelas'
import type { SertifikasiItem, UmkmRingkas } from '@/lib/api/types'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function SertifikasiPublikClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('sertifikasi')
  const [umkm, setUmkm] = useState<UmkmRingkas[]>([])
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState<SertifikasiItem | null>(null)
  const [pilih, setPilih] = useState<UmkmRingkas | null>(null)
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const u = await getDaftarUmkm(desaSlug, { q: q || undefined })
      setUmkm(u.item)
    } finally {
      setLoading(false)
    }
  }, [desaSlug, q])

  useEffect(() => {
    void muat()
  }, [muat])

  async function lihatSertifikasi(u: UmkmRingkas) {
    setPilih(u)
    const s = await getSertifikasi(desaSlug, 'umkm', u.id)
    setDetail(s)
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-primary-800 via-primary-700 to-teal-800 text-white dark:border-neutral-800">
        <div className="container py-10 sm:py-12">
          <p className="text-sm font-medium text-primary-100/90">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold">{t('title')}</h1>
          <p className="mt-2 max-w-xl text-sm text-primary-100/90">{t('subtitle')}</p>
        </div>
      </div>

      <div className="container py-8">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder={t('searchPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 py-2.5 pr-4 pl-10 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          />
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
        ) : (
          <ul className="mt-8 space-y-3">
            {umkm.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => void lihatSertifikasi(u)}
                  className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 text-left transition hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-900/40 dark:hover:border-primary-700"
                >
                  <span className="font-medium text-primary-800 dark:text-primary-100">{u.nama}</span>
                  <SertifikasiBadge tingkat={u.sertifikasi?.tingkat} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {pilih && detail && (
          <div className="mt-8 rounded-2xl border border-primary-200 bg-primary-50 p-6 dark:border-primary-800 dark:bg-primary-900/20">
            <h2 className="font-semibold text-primary-800 dark:text-primary-100">{pilih.nama}</h2>
            {detail.tingkat ? (
              <>
                <div className="mt-3">
                  <SertifikasiBadge tingkat={detail.tingkat} />
                </div>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{t('skorPraktik', { skor: detail.skor })}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{t('belumSertifikasi')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

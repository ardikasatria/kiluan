'use client'

import { getHadiah, tukarHadiah } from '@/lib/api/poin'
import { getPoinSaya } from '@/lib/api/lencana'
import type { HadiahDto } from '@/lib/api/types'
import { kunciIdempotensi, hapusKunciIdempotensi } from '@/lib/kiluan/cart'
import PoinRingkas from '@/components/kiluan/lencana/PoinRingkas'
import { Link } from '@/i18n/navigation'
import { GiftIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function TukarPoinClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('tukarPoin')
  const [saldo, setSaldo] = useState(0)
  const [hadiah, setHadiah] = useState<HadiahDto[]>([])
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  function labelSyarat(syarat: Record<string, unknown>) {
    const tingkat = syarat.tingkat_min
    if (typeof tingkat === 'string') {
      return t('syaratTingkat', { tingkat: tingkat.replace('_', ' ') })
    }
    return null
  }

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const [p, h] = await Promise.all([getPoinSaya(desaSlug), getHadiah(desaSlug)])
      setSaldo(p.saldo)
      setHadiah(h.item)
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  async function tukar(h: HadiahDto) {
    setGalat(null)
    setSukses(null)
    const idem = kunciIdempotensi(`tukar-${h.id}`)
    try {
      const res = await tukarHadiah(desaSlug, h.id, idem)
      hapusKunciIdempotensi(`tukar-${h.id}`)
      setSukses(
        res.kupon
          ? t('suksesKupon', { kode: res.kupon.kode })
          : t('sukses'),
      )
      await muat()
    } catch {
      setGalat(t('error'))
    }
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-kiluan-mint/25 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <p className="text-sm text-primary-600">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h1>
          <div className="mt-4 flex items-center gap-3">
            <PoinRingkas saldo={saldo} />
            <Link href={`/${desaSlug}/saya/lencana`} className="text-sm text-primary-600 hover:underline">
              {t('riwayatPoin')}
            </Link>
          </div>
        </div>
      </div>

      <div className="container py-10">
        {loading ? (
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        ) : (
          <>
            {galat && <p className="mb-4 text-sm text-red-600">{galat}</p>}
            {sukses && (
              <p className="mb-4 text-sm text-green-700 dark:text-green-400">
                {sukses}{' '}
                <Link href={`/${desaSlug}/kupon`} className="underline">
                  {t('lihatDompet')}
                </Link>
              </p>
            )}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {hadiah.map((h) => {
                const syarat = labelSyarat(h.syarat)
                const cukup = saldo >= h.biaya_poin
                const habis = h.stok !== null && h.stok <= 0
                return (
                  <article
                    key={h.id}
                    className="flex flex-col rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700"
                  >
                    <GiftIcon className="size-6 text-kiluan-sea" />
                    <h3 className="mt-2 font-semibold">{h.nama}</h3>
                    {h.deskripsi && (
                      <p className="mt-1 text-sm text-neutral-500">{h.deskripsi}</p>
                    )}
                    <p className="mt-3 font-bold text-kiluan-sea dark:text-kiluan-mint">
                      {t('poin', { count: h.biaya_poin })}
                    </p>
                    {syarat && <p className="mt-1 text-xs text-amber-700">{syarat}</p>}
                    {h.stok !== null && (
                      <p className="mt-1 text-xs text-neutral-500">{t('stok', { count: h.stok })}</p>
                    )}
                    <button
                      type="button"
                      disabled={!cukup || habis}
                      onClick={() => void tukar(h)}
                      className="mt-4 rounded-full bg-primary-700 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-primary-800"
                    >
                      {t('tukar')}
                    </button>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

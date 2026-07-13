'use client'

import { Link } from '@/i18n/navigation'
import { pesanGalat } from '@/lib/api/galat'
import { getNeracaLestari, hitungNeracaLestari } from '@/lib/api/lestari'
import type { NeracaLestariDto } from '@/lib/api/types'
import { useAuth } from '@/contexts/AuthProvider'
import { adalahPengelolaKonten } from '@/lib/kiluan/kelola-akses'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

export default function NeracaLestariClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('lestari.neraca')
  const locale = useLocale() as 'id' | 'en'
  const { user } = useAuth()
  const steward = adalahPengelolaKonten(user?.profil ?? null)
  const [rows, setRows] = useState<NeracaLestariDto[]>([])
  const [periode, setPeriode] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const res = await getNeracaLestari(desaSlug, { publik: true })
      setRows(res.item)
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  async function hitung() {
    setGalat(null)
    try {
      await hitungNeracaLestari(desaSlug, periode)
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    }
  }

  const terbaru = rows[0]

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-emerald-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <p className="text-sm text-primary-600 dark:text-primary-400">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href={`/${desaSlug}/lestari/kapasitas`} className="text-primary-600 hover:underline dark:text-primary-400">{t('linkKapasitas')}</Link>
            <Link href={`/${desaSlug}/lestari/dana`} className="text-primary-600 hover:underline dark:text-primary-400">{t('linkDana')}</Link>
          </div>
        </div>
      </div>
      <div className="container max-w-3xl py-8 space-y-8">
        {galat && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{galat}</p>}
        {steward && (
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-primary-300 p-4 dark:border-primary-700">
            <label className="text-sm">
              <span className="font-medium">{t('periode')}</span>
              <input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} className="mt-1 block rounded-lg border px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900" />
            </label>
            <button type="button" onClick={() => void hitung()} className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white">
              {t('hitung')}
            </button>
          </div>
        )}
        {loading ? (
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        ) : !terbaru ? (
          <p className="text-sm text-neutral-500">{t('empty')}</p>
        ) : (
          <>
            <div className="rounded-2xl border border-primary-200 bg-primary-50 p-6 dark:border-primary-800 dark:bg-primary-950/40">
              <p className="text-sm font-medium text-primary-700 dark:text-primary-300">{t('kpiLabel')}</p>
              <p className="mt-1 text-4xl font-bold text-primary-900 dark:text-primary-100">{pct(terbaru.skor_total)}</p>
              <p className="mt-1 text-xs text-neutral-500">{t('periodeLabel', { periode: terbaru.periode })}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {(['ekologi', 'sosial', 'ekonomi'] as const).map((pilar) => (
                <div key={pilar} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
                  <p className="text-sm text-neutral-500">{t(`pilar.${pilar}`)}</p>
                  <p className="mt-1 text-2xl font-bold">{pct(terbaru[`skor_${pilar}`])}</p>
                </div>
              ))}
            </div>
            <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-800 dark:bg-amber-950/20">
              <h2 className="font-semibold text-amber-900 dark:text-amber-100">{t('kejujuranTitle')}</h2>
              <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/90">{t('kejujuranDesc')}</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-neutral-600 dark:text-neutral-400">{t('klaimDiklaim')}</dt>
                  <dd className="text-lg font-semibold">
                    {terbaru.komponen_ringkas?.klaim_diklaim ??
                      Number((terbaru.komponen as { klaim_dampak_diklaim?: number } | undefined)?.klaim_dampak_diklaim ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-600 dark:text-neutral-400">{t('klaimTervalidasi')}</dt>
                  <dd className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                    {terbaru.komponen_ringkas?.klaim_tervalidasi ??
                      Number((terbaru.komponen as { klaim_dampak_tervalidasi?: number } | undefined)?.klaim_dampak_tervalidasi ?? 0)}
                  </dd>
                </div>
              </dl>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

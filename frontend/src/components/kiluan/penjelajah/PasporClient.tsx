'use client'

import StempelCard from '@/components/kiluan/penjelajah/StempelCard'
import { Link } from '@/i18n/navigation'
import { getPasporSaya } from '@/lib/api/penjelajah'
import type { PasporDto } from '@/lib/api/types'
import { kelompokStempel } from '@/lib/kiluan/penjelajah'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function PasporClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('paspor')
  const [paspor, setPaspor] = useState<PasporDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)

  function teksDampak(ringkas: Record<string, number>) {
    const parts = Object.entries(ringkas).map(([k, v]) => {
      if (k === 'mangrove') return t('impactMangrove', { count: v })
      if (k === 'sampah') return t('impactWaste', { count: v })
      return t('impactGeneric', { key: k, value: v })
    })
    if (!parts.length) return t('noImpact')
    return t('impactSummary', { parts: parts.join(', ') })
  }

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const p = await getPasporSaya(desaSlug)
      setPaspor(p)
    } catch {
      setGalat(t('loginRequired'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, t])

  useEffect(() => {
    void muat()
  }, [muat])

  const grup = paspor ? kelompokStempel(paspor.stempel) : null

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-teal-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <p className="text-sm text-primary-600 dark:text-primary-400">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">{t('seoTitle')}</h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
        </div>
      </div>

      <div className="container py-10">
        {loading ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
        ) : galat ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-amber-900 dark:text-amber-100">{galat}</p>
            <Link href="/masuk" className="mt-2 inline-block text-primary-600 hover:underline dark:text-primary-400">
              {t('signIn')}
            </Link>
          </div>
        ) : paspor && grup ? (
          <>
            <div className="rounded-2xl border border-primary-200 bg-white p-6 shadow-sm dark:border-primary-800 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <SparklesIcon className="size-8 text-primary-500 dark:text-primary-400" />
                <div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {t('stamps', { count: paspor.total_stempel })}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {teksDampak(paspor.ringkasan_dampak)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('verifiedOnlyNote')}</p>
                </div>
              </div>
            </div>

            <section className="mt-10">
              <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t('verifiedStamps')}</h2>
              {grup.terverifikasi.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t('noStamps')}{' '}
                  <Link href={`/${desaSlug}/misi`} className="text-primary-600 hover:underline dark:text-primary-400">
                    {t('startMission')}
                  </Link>
                </p>
              ) : (
                <ul className="space-y-3">
                  {grup.terverifikasi.map((s) => (
                    <StempelCard key={s.id} stempel={s} teksDampak={teksDampak} />
                  ))}
                </ul>
              )}
            </section>

            {grup.menunggu.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t('pendingStamps')}</h2>
                <ul className="space-y-3">
                  {grup.menunggu.map((s) => (
                    <StempelCard key={s.id} stempel={s} teksDampak={teksDampak} />
                  ))}
                </ul>
              </section>
            )}

            {grup.ditolak.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t('rejectedStamps')}</h2>
                <ul className="space-y-3">
                  {grup.ditolak.map((s) => (
                    <StempelCard key={s.id} stempel={s} teksDampak={teksDampak} />
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

'use client'

import { ambilLokasi, getStasiun } from '@/lib/api/penjelajah'
import type { StasiunLestariDto } from '@/lib/api/types'
import { jarakMeter } from '@/lib/kiluan/penjelajah'
import { Link } from '@/i18n/navigation'
import { MapPinIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

const StasiunPeta = dynamic(() => import('@/components/kiluan/penjelajah/StasiunPetaClient'), { ssr: false })

interface Props {
  desaSlug: string
  desaNama: string
}

export default function StasiunClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('stasiunLestari')
  const [stasiun, setStasiun] = useState<StasiunLestariDto[]>([])
  const [loading, setLoading] = useState(true)
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [geoGalat, setGeoGalat] = useState<string | null>(null)
  const [pilih, setPilih] = useState<StasiunLestariDto | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getStasiun(desaSlug)
      setStasiun(res.item)
      setPilih(res.item[0] ?? null)
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  useEffect(() => {
    ambilLokasi()
      .then(setUserLoc)
      .catch(() => setGeoGalat(t('geoDenied')))
  }, [t])

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-sky-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <p className="text-sm text-primary-600 dark:text-primary-400">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
        </div>
      </div>

      <div className="container py-10">
        {geoGalat && (
          <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {geoGalat}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
        ) : stasiun.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('empty')}</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <ul className="space-y-3">
              {stasiun.map((s) => {
                const jarak =
                  userLoc && s.lokasi ? jarakMeter(userLoc, s.lokasi) : null
                const selected = pilih?.id === s.id
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setPilih(s)}
                      className={`w-full rounded-xl border p-5 text-left transition ${
                        selected
                          ? 'border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/30'
                          : 'border-neutral-200 hover:border-primary-200 dark:border-neutral-700 dark:hover:border-primary-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
                        <MapPinIcon className="size-5 text-primary-500" />
                        {s.nama}
                      </div>
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        {t('radius', { tipe: s.tipe, radius: s.radius_m })}
                      </p>
                      {jarak != null && (
                        <p className="mt-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                          {t('jarak', { jarak })}
                        </p>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            {pilih?.lokasi && (
              <StasiunPeta
                stasiun={pilih.lokasi}
                nama={pilih.nama}
                radiusM={pilih.radius_m}
                userLoc={userLoc}
              />
            )}
          </div>
        )}

        <Link
          href={`/${desaSlug}/misi`}
          className="mt-8 inline-block text-sm text-primary-600 hover:underline dark:text-primary-400"
        >
          {t('backToMisi')}
        </Link>
      </div>
    </div>
  )
}

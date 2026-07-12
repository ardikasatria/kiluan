'use client'

import AntreanKurasi from '@/components/kiluan/kurasi/AntreanKurasi'
import { pesanGalat } from '@/lib/api/galat'
import { daftarKeanggotaan, putuskanKeanggotaan, type KeanggotaanAntrean } from '@/lib/api/keanggotaan'
import { labelPeran, type PeranKode } from '@/lib/kiluan/peran'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
}

const FILTER_STATUS = ['menunggu', 'aktif', 'ditolak'] as const

export default function KeanggotaanKelolaClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.keanggotaan')
  const tPeran = useTranslations('peran')
  const [filter, setFilter] = useState<(typeof FILTER_STATUS)[number]>('menunggu')
  const [antrean, setAntrean] = useState<KeanggotaanAntrean[]>([])
  const [pilihId, setPilihId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [memproses, setMemproses] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const pilih = useMemo(() => antrean.find((k) => k.id === pilihId) ?? null, [antrean, pilihId])

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const res = await daftarKeanggotaan(desaSlug, { status: filter })
      setAntrean(res.item)
      setPilihId((prev) => {
        if (prev && res.item.some((k) => k.id === prev)) return prev
        return res.item[0]?.id ?? null
      })
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en') || t('errors.load'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, filter, locale, t])

  useEffect(() => {
    void muat()
  }, [muat])

  async function putuskan(status: 'aktif' | 'ditolak') {
    if (!pilih) return
    setMemproses(true)
    setGalat(null)
    setSukses(null)
    try {
      await putuskanKeanggotaan(desaSlug, pilih.id, status)
      setSukses(t(status === 'aktif' ? 'sukses.setuju' : 'sukses.tolak'))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMemproses(false)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>

      <div className="flex flex-wrap gap-2">
        {FILTER_STATUS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={clsx(
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              filter === s
                ? 'bg-primary-700 text-white dark:bg-primary-600'
                : 'border border-neutral-300 text-neutral-700 hover:border-primary-300 dark:border-neutral-600 dark:text-neutral-300',
            )}
          >
            {t(`filter.${s}`)}
          </button>
        ))}
      </div>

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}
      {sukses && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
          {sukses}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <AntreanKurasi
            items={antrean}
            selectedId={pilihId}
            onSelect={setPilihId}
            loading={loading}
            loadingMessage={t('loading')}
            emptyMessage={t('empty')}
            ariaLabel={t('antreanLabel')}
            renderItem={(k) => (
              <>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  {labelPeran(k.peran as PeranKode, (key) => tPeran(key))}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {t('penggunaId', { id: k.pengguna_id.slice(0, 8) })}
                  {' · '}
                  {t(`status.${k.status}` as 'status.menunggu')}
                </p>
              </>
            )}
          />
        </div>

        <div className="space-y-4 lg:col-span-3">
          {pilih ? (
            <>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{t('detailTitle')}</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-neutral-500 dark:text-neutral-400">{t('fieldPeran')}</dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                      {labelPeran(pilih.peran as PeranKode, (key) => tPeran(key))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 dark:text-neutral-400">{t('fieldPengguna')}</dt>
                    <dd className="font-mono text-xs text-neutral-800 dark:text-neutral-200">{pilih.pengguna_id}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 dark:text-neutral-400">{t('fieldStatus')}</dt>
                    <dd>{t(`status.${pilih.status}` as 'status.menunggu')}</dd>
                  </div>
                </dl>
              </div>

              {filter === 'menunggu' && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
                  <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('panelTitle')}</h3>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('panelHint')}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={memproses}
                      onClick={() => void putuskan('aktif')}
                      className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50"
                    >
                      {memproses ? t('memproses') : t('setujui')}
                    </button>
                    <button
                      type="button"
                      disabled={memproses}
                      onClick={() => void putuskan('ditolak')}
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                    >
                      {t('tolak')}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            !loading && <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('pilihHint')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

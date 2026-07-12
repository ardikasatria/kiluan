'use client'

import AntreanKurasi from '@/components/kiluan/kurasi/AntreanKurasi'
import TingkatSertifikasi from '@/components/kiluan/pasar/TingkatSertifikasi'
import { pesanGalat } from '@/lib/api/galat'
import { getDetailUmkm, getUmkmKelola, verifikasiUmkm } from '@/lib/api/pasar'
import type { UmkmDetail, UmkmRingkas } from '@/lib/api/types'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
}

const FILTER_STATUS = ['menunggu', 'terverifikasi', 'ditolak'] as const

export default function VerifikasiUmkmClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.umkm')
  const [filter, setFilter] = useState<(typeof FILTER_STATUS)[number]>('menunggu')
  const [antrean, setAntrean] = useState<UmkmRingkas[]>([])
  const [pilihId, setPilihId] = useState<string | null>(null)
  const [detail, setDetail] = useState<UmkmDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [memproses, setMemproses] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const pilih = useMemo(() => antrean.find((u) => u.id === pilihId) ?? null, [antrean, pilihId])

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const res = await getUmkmKelola(desaSlug, { status: filter, batas: 50 })
      setAntrean(res.item)
      setPilihId((prev) => {
        if (prev && res.item.some((u) => u.id === prev)) return prev
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

  useEffect(() => {
    if (!pilihId) {
      setDetail(null)
      return
    }
    void getDetailUmkm(desaSlug, pilihId, true).then(setDetail)
  }, [pilihId, desaSlug])

  async function putuskan(keputusan: 'terverifikasi' | 'ditolak') {
    if (!pilih) return
    setMemproses(true)
    setGalat(null)
    setSukses(null)
    try {
      await verifikasiUmkm(desaSlug, pilih.id, keputusan)
      setSukses(t(keputusan === 'terverifikasi' ? 'sukses.setuju' : 'sukses.tolak'))
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
            renderItem={(u) => (
              <>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{u.nama}</p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {u.bidang.nama}
                  {' · '}
                  {t(`status.${u.status_verifikasi}` as 'status.menunggu')}
                </p>
              </>
            )}
          />
        </div>

        <div className="space-y-4 lg:col-span-3">
          {pilih && detail ? (
            <>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{detail.nama}</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{detail.bidang.nama}</p>
                {detail.deskripsi && (
                  <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">{detail.deskripsi}</p>
                )}
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  {detail.telepon && (
                    <div>
                      <dt className="text-neutral-500">{t('fieldTelepon')}</dt>
                      <dd>{detail.telepon}</dd>
                    </div>
                  )}
                  {detail.alamat && (
                    <div className="sm:col-span-2">
                      <dt className="text-neutral-500">{t('fieldAlamat')}</dt>
                      <dd>{detail.alamat}</dd>
                    </div>
                  )}
                  {detail.sertifikasi && (
                    <div className="sm:col-span-2">
                      <dt className="mb-1 text-neutral-500">{t('fieldSertifikasi')}</dt>
                      <dd>
                        <TingkatSertifikasi tingkat={detail.sertifikasi.tingkat} skor={detail.sertifikasi.skor} />
                      </dd>
                    </div>
                  )}
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
                      onClick={() => void putuskan('terverifikasi')}
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

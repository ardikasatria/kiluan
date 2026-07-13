'use client'

import AntreanKurasi from '@/components/kiluan/kurasi/AntreanKurasi'
import PanelKeputusan from '@/components/kiluan/kurasi/PanelKeputusan'
import { pesanGalat } from '@/lib/api/galat'
import { getMediaDetail } from '@/lib/api/media'
import {
  getMonitoringDetail,
  getVerifikasiMonitoring,
  putuskanVerifikasi,
} from '@/lib/api/lestari'
import type { MonitoringDto, VerifikasiDto } from '@/lib/api/types'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
}

export default function VerifikasiMonitoringClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('lestari.verifikasi')
  const [antrean, setAntrean] = useState<VerifikasiDto[]>([])
  const [pilihId, setPilihId] = useState<string | null>(null)
  const [detail, setDetail] = useState<MonitoringDto | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const pilih = useMemo(() => antrean.find((v) => v.id === pilihId) ?? null, [antrean, pilihId])

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const res = await getVerifikasiMonitoring(desaSlug)
      setAntrean(res.item)
      setPilihId((prev) => {
        if (prev && res.item.some((v) => v.id === prev)) return prev
        return res.item[0]?.id ?? null
      })
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en') || t('errors.load'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale, t])

  useEffect(() => {
    void muat()
  }, [muat])

  useEffect(() => {
    if (!pilih) {
      setDetail(null)
      setFotoUrl(null)
      return
    }
    void (async () => {
      try {
        const { monitoring } = await getMonitoringDetail(desaSlug, pilih.entitas_id)
        setDetail(monitoring)
        if (monitoring.media_id) {
          try {
            const media = await getMediaDetail(desaSlug, monitoring.media_id)
            setFotoUrl(media.url ?? null)
          } catch {
            setFotoUrl(null)
          }
        } else {
          setFotoUrl(null)
        }
      } catch {
        setDetail(null)
      }
    })()
  }, [pilih, desaSlug])

  async function putuskan(aksi: 'setuju' | 'tolak', catatan: string) {
    if (!pilih) return
    const hasil = aksi === 'setuju' ? 'valid' : 'invalid'
    await putuskanVerifikasi(desaSlug, pilih.id, hasil, catatan)
    setSukses(t(`sukses.${hasil === 'valid' ? 'valid' : 'invalid'}`))
    await muat()
  }

  const indNama =
    detail && 'nama' in detail.indikator ? detail.indikator.nama : detail ? `#${detail.indikator.id}` : ''

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('desc')}</p>
      {galat && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30">{galat}</p>}
      {sukses && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30">{sukses}</p>
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
            renderItem={(v) => (
              <>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  {t('monitoring')} · {v.metode}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">{new Date(v.dibuat_pada).toLocaleString(locale)}</p>
              </>
            )}
          />
        </div>

        <div className="space-y-4 lg:col-span-3">
          {pilih && detail ? (
            <>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{indNama}</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{t('nilai')}</dt>
                    <dd className="font-medium">{detail.nilai}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{t('waktu')}</dt>
                    <dd>{detail.waktu_ukur}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{t('metode')}</dt>
                    <dd>{detail.metode}</dd>
                  </div>
                </dl>
                {detail.catatan && (
                  <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{detail.catatan}</p>
                )}
                {fotoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fotoUrl} alt="" className="mt-4 max-h-48 rounded-lg object-cover" />
                )}
              </div>
              <PanelKeputusan
                aktif
                sembunyikanRevisi
                labelSetuju={t('valid')}
                onKeputusan={async (aksi, catatan) => {
                  if (aksi === 'minta_revisi') return
                  setGalat(null)
                  setSukses(null)
                  try {
                    await putuskan(aksi, catatan)
                  } catch (err) {
                    setGalat(pesanGalat(err, locale as 'id' | 'en') || t('errors.putuskan'))
                    throw err
                  }
                }}
              />
            </>
          ) : (
            !loading && (
              <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-neutral-500">{t('empty')}</p>
            )
          )}
        </div>
      </div>
    </div>
  )
}

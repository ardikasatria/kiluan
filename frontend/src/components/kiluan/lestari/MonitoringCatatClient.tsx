'use client'

import OfflineIndicator from '@/components/kiluan/OfflineIndicator'
import { Link } from '@/i18n/navigation'
import { pesanGalat } from '@/lib/api/galat'
import {
  ambilLokasi,
  catatMonitoring,
  getIndikator,
  unggahBuktiFoto,
} from '@/lib/api/lestari'
import type { IndikatorEkologiDto, MonitoringCatatPayload } from '@/lib/api/types'
import { uuid7 } from '@/lib/kiluan/uuid7'
import { daftarPembacaanLokal, simpanPembacaanLokal, sinkronMonitoringAntrean } from '@/lib/offline/monitoring-sync'
import { MapPinIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

const METODE = ['survei_lapangan', 'sensor', 'laporan_warga', 'pihak_ketiga'] as const

interface Props {
  desaSlug: string
  desaNama: string
}

export default function MonitoringCatatClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('lestari.monitoring')
  const locale = useLocale()
  const [indikator, setIndikator] = useState<IndikatorEkologiDto[]>([])
  const [indikatorId, setIndikatorId] = useState('')
  const [nilai, setNilai] = useState('')
  const [waktuUkur, setWaktuUkur] = useState(() => new Date().toISOString().slice(0, 10))
  const [metode, setMetode] = useState<string>('survei_lapangan')
  const [catatan, setCatatan] = useState('')
  const [lokasi, setLokasi] = useState<{ lat: number; lng: number } | null>(null)
  const [foto, setFoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [proses, setProses] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)
  const [antrean, setAntrean] = useState(0)

  const indi = indikator.find((i) => String(i.id) === indikatorId)

  const muatAntrean = useCallback(async () => {
    const rows = await daftarPembacaanLokal(desaSlug)
    setAntrean(rows.filter((r) => r.status === 'menunggu_kirim').length)
  }, [desaSlug])

  useEffect(() => {
    void (async () => {
      try {
        const res = await getIndikator(desaSlug)
        setIndikator(res.item)
        if (res.item[0]) setIndikatorId(String(res.item[0].id))
      } catch (err) {
        setGalat(pesanGalat(err, locale as 'id' | 'en'))
      } finally {
        setLoading(false)
      }
      await muatAntrean()
    })()
  }, [desaSlug, locale, muatAntrean])

  async function tangkapLokasi() {
    setGalat(null)
    try {
      setLokasi(await ambilLokasi())
    } catch {
      setGalat(t('errors.geo'))
    }
  }

  async function kirim() {
    if (!indikatorId || !nilai) return
    setProses(true)
    setGalat(null)
    setSukses(null)
    const id = uuid7()
    let mediaId: string | undefined
    try {
      if (foto) mediaId = await unggahBuktiFoto(desaSlug, foto)
      const payload: MonitoringCatatPayload = {
        id,
        indikator_id: Number(indikatorId),
        nilai: Number(nilai),
        waktu_ukur: waktuUkur,
        metode,
        catatan,
        lokasi: lokasi ?? undefined,
        media_id: mediaId,
      }
      if (!navigator.onLine) {
        await simpanPembacaanLokal(desaSlug, payload)
        setSukses(t('savedOffline'))
        setNilai('')
        setCatatan('')
        setFoto(null)
        await muatAntrean()
        return
      }
      await catatMonitoring(desaSlug, payload)
      setSukses(t('savedOnline'))
      setNilai('')
      setCatatan('')
      setFoto(null)
    } catch (err) {
      if (!navigator.onLine) {
        const payload: MonitoringCatatPayload = {
          id,
          indikator_id: Number(indikatorId),
          nilai: Number(nilai),
          waktu_ukur: waktuUkur,
          metode,
          catatan,
          lokasi: lokasi ?? undefined,
        }
        await simpanPembacaanLokal(desaSlug, payload)
        setSukses(t('savedOffline'))
        await muatAntrean()
      } else {
        setGalat(pesanGalat(err, locale as 'id' | 'en'))
      }
    } finally {
      setProses(false)
    }
  }

  async function sinkronSekarang() {
    setProses(true)
    try {
      await sinkronMonitoringAntrean(desaSlug)
      await muatAntrean()
      setSukses(t('syncDone'))
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setProses(false)
    }
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-emerald-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <p className="text-sm text-primary-600 dark:text-primary-400">{desaNama}</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold text-primary-800 dark:text-primary-100">{t('catatTitle')}</h1>
            <OfflineIndicator desaSlug={desaSlug} />
          </div>
          <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">{t('catatSubtitle')}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href={`/${desaSlug}/lestari/monitoring`} className="text-primary-600 hover:underline dark:text-primary-400">
              {t('myReadings')}
            </Link>
          </div>
        </div>
      </div>

      <div className="container max-w-lg py-8">
        {loading ? (
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              void kirim()
            }}
          >
            {galat && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
            )}
            {sukses && (
              <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
                {sukses}
              </p>
            )}

            {antrean > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                <span>{t('pendingCount', { count: antrean })}</span>
                <button
                  type="button"
                  onClick={() => void sinkronSekarang()}
                  disabled={proses || !navigator.onLine}
                  className="font-medium text-primary-700 hover:underline disabled:opacity-50 dark:text-primary-300"
                >
                  {t('syncNow')}
                </button>
              </div>
            )}

            <label className="block text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{t('indikator')}</span>
              <select
                value={indikatorId}
                onChange={(e) => setIndikatorId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
                required
              >
                {indikator.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nama} ({i.satuan})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {t('nilai')} {indi ? `(${indi.satuan})` : ''}
              </span>
              <input
                type="number"
                step="any"
                value={nilai}
                onChange={(e) => setNilai(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{t('waktuUkur')}</span>
              <input
                type="date"
                value={waktuUkur}
                onChange={(e) => setWaktuUkur(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{t('metode')}</span>
              <select
                value={metode}
                onChange={(e) => setMetode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
              >
                {METODE.map((m) => (
                  <option key={m} value={m}>
                    {t(`metodeOpsi.${m}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{t('catatan')}</span>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void tangkapLokasi()}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600"
              >
                <MapPinIcon className="size-4" />
                {lokasi ? t('gpsOk') : t('gpsCapture')}
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600">
                <PhotoIcon className="size-4" />
                {foto ? foto.name : t('foto')}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <button
              type="submit"
              disabled={proses}
              className="w-full rounded-xl bg-primary-700 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-60 dark:bg-primary-600"
            >
              {proses ? t('saving') : t('submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

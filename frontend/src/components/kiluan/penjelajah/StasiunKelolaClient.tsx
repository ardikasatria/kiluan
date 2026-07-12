'use client'

import { pesanGalat } from '@/lib/api/galat'
import {
  buatStasiun,
  getStasiunKelola,
  hapusStasiun,
  ubahStasiun,
} from '@/lib/api/penjelajah'
import type { StasiunLestariDto } from '@/lib/api/types'
import { ArrowPathIcon, MapPinIcon, PlusIcon, PowerIcon, QrCodeIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

const TIPE = ['dermaga', 'titik_mangrove', 'pos'] as const

const inputCls =
  'mt-1.5 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950'

export default function StasiunKelolaClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.stasiun')
  const [item, setItem] = useState<StasiunLestariDto[]>([])
  const [pilihId, setPilihId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [menyimpan, setMenyimpan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)
  const [mode, setMode] = useState<'buat' | 'edit'>('buat')

  const pilih = item.find((s) => s.id === pilihId) ?? null

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const res = await getStasiunKelola(desaSlug)
      setItem(res.item)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en') || t('errors.load'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale, t])

  useEffect(() => {
    void muat()
  }, [muat])

  function mulaiEdit(s: StasiunLestariDto) {
    setMode('edit')
    setPilihId(s.id)
    setSukses(null)
    setGalat(null)
  }

  function mulaiBuat() {
    setMode('buat')
    setPilihId(null)
    setSukses(null)
    setGalat(null)
  }

  async function simpanBuat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setMenyimpan('form')
    setGalat(null)
    setSukses(null)
    try {
      const lat = fd.get('lat') ? Number(fd.get('lat')) : null
      const lng = fd.get('lng') ? Number(fd.get('lng')) : null
      await buatStasiun(desaSlug, {
        nama: String(fd.get('nama')),
        tipe: String(fd.get('tipe')),
        radius_m: Number(fd.get('radius_m') || 50),
        lokasi: lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)
          ? { lat, lng }
          : null,
      })
      e.currentTarget.reset()
      setSukses(t('sukses.buat'))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMenyimpan(null)
    }
  }

  async function simpanEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!pilihId) return
    const fd = new FormData(e.currentTarget)
    setMenyimpan('form')
    setGalat(null)
    setSukses(null)
    try {
      const lat = fd.get('lat') ? Number(fd.get('lat')) : null
      const lng = fd.get('lng') ? Number(fd.get('lng')) : null
      await ubahStasiun(desaSlug, pilihId, {
        nama: String(fd.get('nama')),
        tipe: String(fd.get('tipe')),
        radius_m: Number(fd.get('radius_m') || 50),
        lokasi: lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)
          ? { lat, lng }
          : null,
        rotasi_qr: fd.get('rotasi_qr') === 'on',
      })
      setSukses(t('sukses.ubah'))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMenyimpan(null)
    }
  }

  async function toggleAktif(s: StasiunLestariDto) {
    setMenyimpan(s.id)
    setGalat(null)
    setSukses(null)
    try {
      if (s.aktif) {
        await hapusStasiun(desaSlug, s.id)
        setSukses(t('sukses.nonaktif'))
      } else {
        await ubahStasiun(desaSlug, s.id, { aktif: true })
        setSukses(t('sukses.aktif'))
      }
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMenyimpan(null)
    }
  }

  async function rotasiQr(s: StasiunLestariDto) {
    setMenyimpan(`qr-${s.id}`)
    setGalat(null)
    setSukses(null)
    try {
      await ubahStasiun(desaSlug, s.id, { rotasi_qr: true })
      setSukses(t('sukses.rotasi'))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMenyimpan(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">{t('loading')}</p>
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
          {galat}
        </p>
      )}
      {sukses && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
          {sukses}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="border-b border-neutral-200 bg-neutral-50/70 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-800/50">
          <h3 className="font-semibold text-primary-800 dark:text-primary-100">{t('katalog')}</h3>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('katalogHint')}</p>
        </div>
        {item.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-500">{t('empty')}</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {item.map((s) => (
              <li
                key={s.id}
                className={clsx(
                  'flex flex-col gap-3 px-5 py-4',
                  pilihId === s.id && mode === 'edit' && 'bg-primary-50/40 dark:bg-primary-950/20',
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <button type="button" onClick={() => mulaiEdit(s)} className="min-w-0 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{s.nama}</p>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {t(`tipe.${s.tipe}` as 'tipe.dermaga')}
                      </span>
                      <span
                        className={
                          s.aktif
                            ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'
                            : 'rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                        }
                      >
                        {s.aktif ? t('status.aktif') : t('status.nonaktif')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {t('radius', { m: s.radius_m })}
                      {s.lokasi
                        ? ` · ${s.lokasi.lat.toFixed(4)}, ${s.lokasi.lng.toFixed(4)}`
                        : ` · ${t('tanpaLokasi')}`}
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void rotasiQr(s)}
                      disabled={menyimpan === `qr-${s.id}` || !s.aktif}
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50 dark:border-neutral-600"
                    >
                      <ArrowPathIcon className="size-3.5" aria-hidden />
                      {menyimpan === `qr-${s.id}` ? t('menyimpan') : t('rotasiQr')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleAktif(s)}
                      disabled={menyimpan === s.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50 dark:border-neutral-600"
                    >
                      <PowerIcon className="size-3.5" aria-hidden />
                      {menyimpan === s.id
                        ? t('menyimpan')
                        : s.aktif
                          ? t('nonaktifkan')
                          : t('aktifkan')}
                    </button>
                  </div>
                </div>
                {s.qr_token && (
                  <div className="flex items-start gap-2 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-800/60">
                    <QrCodeIcon className="mt-0.5 size-4 shrink-0 text-primary-600 dark:text-primary-300" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                        {t('qrToken')}
                      </p>
                      <p className="break-all font-mono text-xs text-neutral-800 dark:text-neutral-200">
                        {s.qr_token}
                      </p>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-200">
              {mode === 'buat' ? (
                <PlusIcon className="size-5" aria-hidden />
              ) : (
                <MapPinIcon className="size-5" aria-hidden />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-primary-800 dark:text-primary-100">
                {mode === 'buat' ? t('formBuat') : t('formEdit')}
              </h3>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {mode === 'buat' ? t('formBuatHint') : t('formEditHint')}
              </p>
            </div>
          </div>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={mulaiBuat}
              className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-semibold dark:border-neutral-600"
            >
              {t('batalEdit')}
            </button>
          )}
        </div>

        <form
          key={mode === 'edit' ? pilihId ?? 'edit' : 'buat'}
          onSubmit={(e) => void (mode === 'buat' ? simpanBuat(e) : simpanEdit(e))}
          className="mt-5 grid gap-4 sm:grid-cols-2"
        >
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 sm:col-span-2">
            {t('field.nama')}
            <input
              name="nama"
              required
              defaultValue={pilih?.nama ?? ''}
              placeholder={t('placeholder.nama')}
              className={inputCls}
            />
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.tipe')}
            <select name="tipe" defaultValue={pilih?.tipe ?? 'dermaga'} className={inputCls}>
              {TIPE.map((tipe) => (
                <option key={tipe} value={tipe}>
                  {t(`tipe.${tipe}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.radius')}
            <input
              name="radius_m"
              type="number"
              min={10}
              defaultValue={pilih?.radius_m ?? 50}
              className={inputCls}
            />
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.lat')}
            <input
              name="lat"
              type="number"
              step="any"
              defaultValue={pilih?.lokasi?.lat ?? ''}
              placeholder={t('placeholder.lat')}
              className={inputCls}
            />
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.lng')}
            <input
              name="lng"
              type="number"
              step="any"
              defaultValue={pilih?.lokasi?.lng ?? ''}
              placeholder={t('placeholder.lng')}
              className={inputCls}
            />
          </label>
          {mode === 'edit' && (
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 sm:col-span-2">
              <input name="rotasi_qr" type="checkbox" className="rounded border-neutral-300" />
              {t('field.rotasiQr')}
            </label>
          )}
          <button
            type="submit"
            disabled={menyimpan === 'form' || (mode === 'edit' && !pilih)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50 sm:col-span-2 sm:w-fit dark:bg-primary-600"
          >
            <PlusIcon className="size-4" aria-hidden />
            {menyimpan === 'form'
              ? t('menyimpan')
              : mode === 'buat'
                ? t('tambahStasiun')
                : t('simpanUbah')}
          </button>
        </form>
      </section>
    </div>
  )
}

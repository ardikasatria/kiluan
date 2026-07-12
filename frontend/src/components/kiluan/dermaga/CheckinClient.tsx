'use client'

import { checkinBooking, daftarBooking, selesaiBooking } from '@/lib/api/dermaga'
import { pesanGalat } from '@/lib/api/galat'
import type { BookingDto } from '@/lib/api/types'
import PemindaiQR from '@/components/kiluan/penjelajah/PemindaiQR'
import { kunciIdempotensi, hapusKunciIdempotensi } from '@/lib/kiluan/cart'
import { formatTanggal } from '@/lib/kiluan/lencana'
import { QrCodeIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

export default function CheckinClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.checkin')
  const tr = t as unknown as (key: string) => string
  const [kode, setKode] = useState('')
  const [bookingHariIni, setBookingHariIni] = useState<BookingDto[]>([])
  const [sukses, setSukses] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [aksiId, setAksiId] = useState<string | null>(null)

  const hariIni = new Date().toISOString().slice(0, 10)

  const muatBooking = useCallback(async () => {
    try {
      const res = await daftarBooking(desaSlug, { tanggal: hariIni })
      setBookingHariIni(res.item)
    } catch {
      setBookingHariIni([])
    }
  }, [desaSlug, hariIni])

  useEffect(() => {
    void muatBooking()
  }, [muatBooking])

  async function submitCheckin(token?: string) {
    const val = (token ?? kode).trim()
    if (!val) return
    setLoading(true)
    setGalat(null)
    setSukses(null)
    try {
      const bk = await checkinBooking(desaSlug, val)
      const statusLabel = tr(`status.${bk.status}`)
      setSukses(t('sukses', { kode: bk.kode_checkin, status: statusLabel }))
      setKode('')
      await muatBooking()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en') || t('error'))
    } finally {
      setLoading(false)
    }
  }

  async function selesai(bk: BookingDto) {
    if (!confirm(t('selesaiKonfirmasi', { kode: bk.kode_checkin }))) return
    setAksiId(bk.id)
    setGalat(null)
    const idem = kunciIdempotensi(`selesai-${bk.id}`)
    try {
      await selesaiBooking(desaSlug, bk.id, idem)
      hapusKunciIdempotensi(`selesai-${bk.id}`)
      setSukses(t('selesaiSukses', { kode: bk.kode_checkin }))
      await muatBooking()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setAksiId(null)
    }
  }

  const badge = (status: string) =>
    clsx(
      'rounded-full px-2 py-0.5 text-xs font-medium',
      status === 'terkonfirmasi' && 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
      status === 'checkin' && 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
      !['terkonfirmasi', 'checkin'].includes(status) && 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800',
    )

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('desc')}</p>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900/40">
        <div className="flex items-center gap-2">
          <QrCodeIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('formLabel')}</p>
        </div>

        <div className="mt-4">
          <PemindaiQR
            value={kode}
            onChange={(token) => {
              setKode(token)
              if (token.length >= 6) void submitCheckin(token)
            }}
          />
        </div>

        <button
          type="button"
          disabled={loading || !kode.trim()}
          onClick={() => void submitCheckin()}
          className="mt-4 w-full rounded-full bg-primary-700 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 dark:bg-primary-600"
        >
          {loading ? t('memproses') : t('submit')}
        </button>
      </div>

      {sukses && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
          {sukses}
        </p>
      )}
      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}

      <section>
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          {t('bookingHariIni', {
            tanggal: formatTanggal(hariIni, locale === 'en' ? 'en-US' : 'id-ID'),
          })}
        </h3>
        {bookingHariIni.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{t('emptyBooking')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700">
            {bookingHariIni.map((bk) => (
              <li key={bk.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div>
                  <p className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {bk.kode_checkin}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {bk.jumlah_orang} {t('orang')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={badge(bk.status)}>{tr(`status.${bk.status}`) || bk.status}</span>
                  {bk.status === 'checkin' && (
                    <button
                      type="button"
                      disabled={aksiId === bk.id}
                      onClick={() => void selesai(bk)}
                      className="rounded-full border border-primary-300 px-3 py-1 text-xs font-medium dark:border-primary-600"
                    >
                      {aksiId === bk.id ? t('memproses') : t('selesai')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

'use client'

import BuktiTransferThumb from '@/components/kiluan/dermaga/BuktiTransferThumb'
import PesananTimeline from '@/components/kiluan/dermaga/PesananTimeline'
import { batalkanPesanan, getPesanan, unggahBuktiPembayaran, buatPembayaran } from '@/lib/api/dermaga'
import { ajukanRefund, getPengaturanDesa } from '@/lib/api/uang'
import { konfirmasiMedia, presignMedia, unggahKeMinio } from '@/lib/api/media'
import type { PembayaranDto, PesananRingkas } from '@/lib/api/types'
import { kunciIdempotensi, hapusKunciIdempotensi } from '@/lib/kiluan/cart'
import { formatHarga } from '@/lib/kiluan/pasar'
import { formatTanggal } from '@/lib/kiluan/lencana'
import {
  ArrowLeftIcon,
  BanknotesIcon,
  ClockIcon,
  DocumentTextIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { Link } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  desaSlug: string
  pesananId: string
  desaNama?: string
}

const cardClass =
  'rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/50'

function qrUrl(kode: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(kode)}`
}

function sisaDetik(iso: string | null | undefined) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 0
  return Math.floor(ms / 1000)
}

function formatCountdown(detik: number) {
  const m = Math.floor(detik / 60)
  const s = detik % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function teksKebijakan(raw: Record<string, unknown> | undefined): string | null {
  if (!raw) return null
  for (const key of ['ringkasan', 'teks', 'catatan', 'deskripsi']) {
    const v = raw[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

export default function PesananClient({ desaSlug, pesananId, desaNama }: Props) {
  const t = useTranslations('pesanan')
  const locale = useLocale()
  const [pesanan, setPesanan] = useState<PesananRingkas | null>(null)
  const [pembayaran, setPembayaran] = useState<PembayaranDto | null>(null)
  const [sisa, setSisa] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [alasanRefund, setAlasanRefund] = useState('')
  const [refundSukses, setRefundSukses] = useState(false)
  const [membatalkan, setMembatalkan] = useState(false)
  const [kebijakan, setKebijakan] = useState<string | null>(null)
  const bayarInit = useRef(false)

  const tStatus = t as unknown as (key: string) => string
  const labelStatus = (status: string) => {
    try {
      return tStatus(`status.${status}`)
    } catch {
      return status.replace(/_/g, ' ')
    }
  }

  const muatPesanan = useCallback(async () => {
    const p = await getPesanan(desaSlug, pesananId)
    setPesanan(p)
    setSisa(sisaDetik(p.kedaluwarsa_pada))
    return p
  }, [desaSlug, pesananId])

  const muat = useCallback(async () => {
    try {
      const p = await muatPesanan()
      if (p.status === 'menunggu_pembayaran' && !bayarInit.current) {
        bayarInit.current = true
        const idem = kunciIdempotensi(`bayar-${p.id}`)
        try {
          const { pembayaran: pay } = await buatPembayaran(desaSlug, p.id, 'transfer_manual', idem)
          setPembayaran(pay)
          hapusKunciIdempotensi(`bayar-${p.id}`)
        } catch {
          /* upaya bayar sudah ada */
        }
      }
    } catch {
      setGalat(t('loadError'))
    }
  }, [desaSlug, muatPesanan, t])

  useEffect(() => {
    void muat()
  }, [muat])

  useEffect(() => {
    void getPengaturanDesa(desaSlug)
      .then((p) => setKebijakan(teksKebijakan(p.kebijakan_pembatalan)))
      .catch(() => {})
  }, [desaSlug])

  useEffect(() => {
    if (sisa == null || sisa <= 0) return
    const timer = setInterval(() => setSisa((x) => (x != null && x > 0 ? x - 1 : 0)), 1000)
    return () => clearInterval(timer)
  }, [sisa])

  useEffect(() => {
    if (!pesanan || pesanan.status !== 'menunggu_pembayaran') return
    const poll = setInterval(() => void muatPesanan(), 30_000)
    return () => clearInterval(poll)
  }, [pesanan, muatPesanan])

  async function unggahBukti(file: File) {
    if (!pembayaran) return
    setUploading(true)
    setGalat(null)
    try {
      const pre = await presignMedia(desaSlug, file)
      await unggahKeMinio(pre.url_unggah, file)
      const media = await konfirmasiMedia(desaSlug, {
        media_id: pre.media_id,
        tipe: file.type.startsWith('video/') ? 'video' : 'foto',
        alt: file.name.replace(/\.[^.]+$/, ''),
      })
      await unggahBuktiPembayaran(desaSlug, pembayaran.id, media.id)
      await muat()
    } catch {
      setGalat(t('uploadError'))
    } finally {
      setUploading(false)
    }
  }

  async function ajukanRefundPesanan() {
    if (!alasanRefund.trim()) return
    setGalat(null)
    const idem = kunciIdempotensi(`refund-${pesananId}`)
    try {
      await ajukanRefund(desaSlug, { pesanan_id: pesananId, alasan: alasanRefund.trim() }, idem)
      hapusKunciIdempotensi(`refund-${pesananId}`)
      setRefundSukses(true)
      await muat()
    } catch {
      setGalat(t('refund.error'))
    }
  }

  async function batalkan() {
    if (!window.confirm(t('batal.confirm'))) return
    setMembatalkan(true)
    setGalat(null)
    try {
      await batalkanPesanan(desaSlug, pesananId)
      await muat()
    } catch {
      setGalat(t('batal.error'))
    } finally {
      setMembatalkan(false)
    }
  }

  if (!pesanan) {
    return (
      <p className="container py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
        {t('loading')}
      </p>
    )
  }

  const bookings = (pesanan.item ?? []).filter((it) => it.booking)
  const menungguBayar = pesanan.status === 'menunggu_pembayaran'
  const menungguVerifikasi = pembayaran?.status === 'menunggu_verifikasi' || pembayaran?.bukti_media_id

  return (
    <div className="pb-20">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-kiluan-sea/15 via-primary-50 to-white dark:border-neutral-800 dark:from-neutral-950 dark:via-primary-950/60 dark:to-neutral-900">
        <div className="container max-w-3xl py-10 sm:py-12">
          <Link
            href={`/${desaSlug}/pesanan`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            {t('riwayat.back')}
          </Link>
          {desaNama && (
            <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{desaNama}</p>
          )}
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('label', { code: pesanan.kode_pesanan })}</p>
          <h1 className="mt-1 text-2xl font-bold text-primary-800 dark:text-primary-100 sm:text-3xl">
            {labelStatus(pesanan.status)}
          </h1>
          <p className="mt-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {formatHarga(pesanan.total, 'per_paket')}
          </p>
          {pesanan.dibuat_pada && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {formatTanggal(pesanan.dibuat_pada, locale === 'en' ? 'en-US' : 'id-ID')}
            </p>
          )}

          {menungguBayar && sisa != null && (
            <div
              className={clsx(
                'mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium',
                sisa > 0
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200',
              )}
            >
              <ClockIcon className="size-4 shrink-0" aria-hidden />
              {sisa > 0 ? t('payWithin', { time: formatCountdown(sisa) }) : t('payExpired')}
            </div>
          )}

          {menungguBayar && sisa !== 0 && (
            <button
              type="button"
              disabled={membatalkan}
              onClick={() => void batalkan()}
              className="mt-4 rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-neutral-900 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              {membatalkan ? t('batal.processing') : t('batal.action')}
            </button>
          )}
        </div>
      </div>

      <div className="container max-w-3xl space-y-6 py-10">
        <section className={cardClass}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t('timeline')}
          </h2>
          <div className="mt-4">
            <PesananTimeline status={pesanan.status} label={tStatus} />
          </div>
          {['dibatalkan', 'kedaluwarsa', 'refund_diajukan'].includes(pesanan.status) && (
            <p className="mt-3 text-sm text-amber-800 dark:text-amber-300">{labelStatus(pesanan.status)}</p>
          )}
        </section>

        {(pesanan.item ?? []).length > 0 && (
          <section className={cardClass}>
            <h2 className="flex items-center gap-2 font-semibold text-primary-800 dark:text-primary-100">
              <DocumentTextIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
              {t('items')}
            </h2>
            <ul className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
              {pesanan.item!.map((it) => (
                <li key={it.id} className="flex flex-wrap justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{it.nama_snapshot}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      × {it.jumlah}
                      {it.status_fulfillment && ` · ${it.status_fulfillment.replace(/_/g, ' ')}`}
                    </p>
                  </div>
                  <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {formatHarga(it.subtotal, 'per_paket')}
                  </p>
                </li>
              ))}
            </ul>
            {pesanan.diskon > 0 && (
              <p className="mt-3 text-sm text-kiluan-sea dark:text-kiluan-mint">
                {t('diskonApplied', { amount: formatHarga(pesanan.diskon, 'per_paket') })}
              </p>
            )}
          </section>
        )}

        {pembayaran?.instruksi_qris_statis && menungguBayar && (
          <section className={cardClass}>
            <h2 className="flex items-center gap-2 font-semibold text-primary-800 dark:text-primary-100">
              <BanknotesIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
              {t('manualTransfer')}
            </h2>
            <p className="mt-2 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300">
              {pembayaran.instruksi_qris_statis.catatan}
            </p>
            <div className="mt-4 flex justify-center rounded-xl bg-white p-4 dark:bg-white">
              <Image
                src={pembayaran.instruksi_qris_statis.url}
                alt="QRIS"
                width={200}
                height={200}
                className="rounded-lg"
                unoptimized
              />
            </div>

            {menungguVerifikasi ? (
              <div className="mt-6 rounded-xl border border-primary-200 bg-primary-50/80 p-4 dark:border-primary-800 dark:bg-primary-950/40">
                <p className="text-sm font-medium text-primary-800 dark:text-primary-200">{t('proofSubmitted')}</p>
                {pembayaran.bukti_media_id && (
                  <div className="mt-3">
                    <BuktiTransferThumb desaSlug={desaSlug} mediaId={pembayaran.bukti_media_id} />
                  </div>
                )}
                <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">{t('treasurerNote')}</p>
              </div>
            ) : (
              <label className="mt-6 block">
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{t('uploadProof')}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full text-sm text-neutral-600 file:me-3 file:rounded-lg file:border-0 file:bg-primary-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-800 dark:text-neutral-400 dark:file:bg-primary-900/60 dark:file:text-primary-200"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void unggahBukti(f)
                  }}
                />
              </label>
            )}

            {galat && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
                {galat}
              </p>
            )}
            {!menungguVerifikasi && (
              <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{t('treasurerNote')}</p>
            )}
          </section>
        )}

        {bookings.length > 0 && (
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 font-semibold text-primary-800 dark:text-primary-100">
              <QrCodeIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
              {t('checkIn.title')}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('checkIn.hint')}</p>
            {bookings.map((it) => (
              <div
                key={it.id}
                className={clsx(
                  cardClass,
                  'flex flex-col items-center gap-6 sm:flex-row sm:items-start',
                )}
              >
                {it.booking && (
                  <>
                    <div className="rounded-xl bg-white p-3 shadow-inner">
                      <Image
                        src={qrUrl(it.booking.kode_checkin)}
                        alt={t('checkIn.qrAlt')}
                        width={140}
                        height={140}
                        unoptimized
                      />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{it.nama_snapshot}</p>
                      <p className="mt-2 font-mono text-lg tracking-wider text-primary-800 dark:text-primary-200">
                        {it.booking.kode_checkin}
                      </p>
                      <p className="mt-1 text-xs capitalize text-neutral-500 dark:text-neutral-400">
                        {labelStatus(it.booking.status)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </section>
        )}

        {['dibayar', 'diproses', 'selesai'].includes(pesanan.status) && (
          <section className={cardClass}>
            <h2 className="font-semibold text-primary-800 dark:text-primary-100">{t('refund.title')}</h2>
            {kebijakan && (
              <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {t('kebijakanTitle')}
                </p>
                <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{kebijakan}</p>
              </div>
            )}
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{t('refund.note')}</p>
            {refundSukses ? (
              <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
                {t('refund.success')}
              </p>
            ) : (
              <>
                <textarea
                  value={alasanRefund}
                  onChange={(e) => setAlasanRefund(e.target.value)}
                  placeholder={t('refund.placeholder')}
                  rows={3}
                  className="mt-3 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                />
                <button
                  type="button"
                  onClick={() => void ajukanRefundPesanan()}
                  className="mt-3 rounded-full border border-primary-300 bg-primary-50 px-5 py-2 text-sm font-medium text-primary-800 hover:bg-primary-100 dark:border-primary-700 dark:bg-primary-950/40 dark:text-primary-200 dark:hover:bg-primary-900/60"
                >
                  {t('refund.submit')}
                </button>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

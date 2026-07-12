'use client'

import { daftarPembayaranAntrean, konfirmasiManual } from '@/lib/api/dermaga'
import { pesanGalat } from '@/lib/api/galat'
import {
  buatPayout,
  getPayout,
  getRekening,
  getTransaksi,
  transisiPayout,
  verifikasiRekening,
} from '@/lib/api/uang'
import type { PembayaranDto, PayoutDto, RekeningDto, TransaksiDto } from '@/lib/api/types'
import { Link } from '@/i18n/navigation'
import { kunciIdempotensi, hapusKunciIdempotensi } from '@/lib/kiluan/cart'
import { formatHarga } from '@/lib/kiluan/pasar'
import { formatTanggal } from '@/lib/kiluan/lencana'
import { BanknotesIcon, CheckBadgeIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
}

function kunciPenyedia(tipe: string, id: string) {
  return `${tipe}:${id}`
}

export default function BendaharaClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.bendahara')
  const tr = t as unknown as (key: string) => string
  const [antrean, setAntrean] = useState<PembayaranDto[]>([])
  const [transaksiDirilis, setTransaksiDirilis] = useState<TransaksiDto[]>([])
  const [transaksiDitahan, setTransaksiDitahan] = useState<TransaksiDto[]>([])
  const [rekeningMap, setRekeningMap] = useState<Record<string, RekeningDto[]>>({})
  const [rekeningLoading, setRekeningLoading] = useState<string | null>(null)
  const [payout, setPayout] = useState<PayoutDto[]>([])
  const [loading, setLoading] = useState(true)
  const [aksiId, setAksiId] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const [a, tDirilis, tDitahan, p] = await Promise.all([
        daftarPembayaranAntrean(desaSlug),
        getTransaksi(desaSlug, { status: 'dirilis' }),
        getTransaksi(desaSlug, { status: 'ditahan' }).catch(() => ({ item: [] as TransaksiDto[] })),
        getPayout(desaSlug),
      ])
      setAntrean(a.item)
      setTransaksiDirilis(tDirilis.item)
      setTransaksiDitahan(tDitahan.item)
      setPayout(p.item)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  const ringkasanEscrow = useMemo(() => {
    const ditahan = transaksiDitahan.reduce((s, tx) => s + tx.neto_penyedia, 0)
    const dirilis = transaksiDirilis
      .filter((tx) => !tx.payout_id)
      .reduce((s, tx) => s + tx.neto_penyedia, 0)
    const menungguKonfirmasi = antrean.reduce((s, p) => s + p.jumlah, 0)
    return { ditahan, dirilis, menungguKonfirmasi }
  }, [antrean, transaksiDitahan, transaksiDirilis])

  const grupDirilis = useMemo(() => {
    const m = new Map<string, { tipe: string; id: string; neto: number }>()
    for (const tx of transaksiDirilis) {
      if (tx.payout_id) continue
      const k = kunciPenyedia(tx.penyedia.tipe, tx.penyedia.id)
      const ada = m.get(k) ?? { tipe: tx.penyedia.tipe, id: tx.penyedia.id, neto: 0 }
      ada.neto += tx.neto_penyedia
      m.set(k, ada)
    }
    return [...m.values()]
  }, [transaksiDirilis])

  const labelPenyedia = (tipe: string) => tr(`penyediaTipe.${tipe}`) || tipe
  const labelStatusPayout = (status: string) => tr(`statusPayout.${status}`) || status

  async function konfirmasi(pay: PembayaranDto) {
    if (!confirm(t('konfirmasi.konfirmasiDialog'))) return
    setGalat(null)
    setSukses(null)
    setAksiId(pay.id)
    const idem = kunciIdempotensi(`konf-${pay.id}`)
    try {
      await konfirmasiManual(desaSlug, pay.id, idem)
      hapusKunciIdempotensi(`konf-${pay.id}`)
      setSukses(t('konfirmasi.sukses'))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setAksiId(null)
    }
  }

  async function muatRekening(ptipe: string, pid: string) {
    const k = kunciPenyedia(ptipe, pid)
    setRekeningLoading(k)
    setGalat(null)
    try {
      const r = await getRekening(desaSlug, { penyedia_tipe: ptipe, penyedia_id: pid })
      setRekeningMap((prev) => ({ ...prev, [k]: r.item }))
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setRekeningLoading(null)
    }
  }

  async function verifikasiRek(rekeningId: string) {
    setGalat(null)
    try {
      await verifikasiRekening(desaSlug, rekeningId, true)
      setSukses(t('payout.rekeningTerverifikasi'))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    }
  }

  async function jalankanPayout(ptipe: string, pid: string, rekeningId: string) {
    if (!confirm(t('payout.konfirmasiDialog'))) return
    setGalat(null)
    setSukses(null)
    const k = kunciPenyedia(ptipe, pid)
    setAksiId(k)
    const idem = kunciIdempotensi(`payout-${ptipe}-${pid}`)
    try {
      const { payout: po } = await buatPayout(
        desaSlug,
        { penyedia_tipe: ptipe, penyedia_id: pid, rekening_id: rekeningId, metode: 'manual' },
        idem,
      )
      hapusKunciIdempotensi(`payout-${ptipe}-${pid}`)
      await transisiPayout(desaSlug, po.id, 'tandai_berhasil')
      setSukses(t('payout.sukses'))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setAksiId(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">{t('loading')}</p>
  }

  return (
    <div className="space-y-10">
      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}
      {sukses && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
          {sukses}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{t('escrow.menunggu')}</p>
          <p className="mt-1 text-xl font-bold text-primary-800 dark:text-primary-200">
            {formatHarga(ringkasanEscrow.menungguKonfirmasi, 'per_paket')}
          </p>
          <p className="mt-1 text-xs text-neutral-500">{t('escrow.menungguHint', { count: antrean.length })}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{t('escrow.ditahan')}</p>
          <p className="mt-1 text-xl font-bold text-amber-800 dark:text-amber-200">
            {formatHarga(ringkasanEscrow.ditahan, 'per_paket')}
          </p>
          <p className="mt-1 text-xs text-neutral-500">{t('escrow.ditahanHint')}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{t('escrow.dirilis')}</p>
          <p className="mt-1 text-xl font-bold text-kiluan-sea">
            {formatHarga(ringkasanEscrow.dirilis, 'per_paket')}
          </p>
          <p className="mt-1 text-xs text-neutral-500">{t('escrow.dirilisHint')}</p>
        </div>
      </section>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t('refundLink')}{' '}
        <Link href={`/${desaSlug}/kelola/refund`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          {t('refundCta')}
        </Link>
      </p>

      <section>
        <div className="flex items-center gap-2">
          <CheckBadgeIcon className="size-5 text-primary-600" aria-hidden />
          <h3 className="text-lg font-semibold">{t('konfirmasi.title')}</h3>
        </div>
        <p className="mt-1 text-sm text-neutral-500">{t('konfirmasi.desc')}</p>
        {antrean.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">{t('konfirmasi.empty')}</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700">
            {antrean.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{formatHarga(p.jumlah, 'per_paket')}</p>
                  <p className="text-xs text-neutral-500">
                    {p.metode} · {t('konfirmasi.bukti')}{' '}
                    {p.bukti_media_id ? t('konfirmasi.terunggah') : t('konfirmasi.belumAda')}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!p.bukti_media_id || aksiId === p.id}
                  onClick={() => void konfirmasi(p)}
                  className="rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-primary-800"
                >
                  {aksiId === p.id ? t('memproses') : t('konfirmasi.confirm')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2">
          <BanknotesIcon className="size-5 text-kiluan-sea" aria-hidden />
          <h3 className="text-lg font-semibold">{t('payout.title')}</h3>
        </div>
        <p className="mt-1 text-sm text-neutral-500">{t('payout.desc')}</p>
        {grupDirilis.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">{t('payout.empty')}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {grupDirilis.map((g) => {
              const k = kunciPenyedia(g.tipe, g.id)
              const rekening = rekeningMap[k] ?? []
              return (
                <li key={k} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                  <p className="font-medium">
                    {labelPenyedia(g.tipe)} · {t('payout.neto')} {formatHarga(g.neto, 'per_paket')}
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-sm text-primary-600 hover:underline disabled:opacity-50 dark:text-primary-400"
                    disabled={rekeningLoading === k}
                    onClick={() => void muatRekening(g.tipe, g.id)}
                  >
                    {rekeningLoading === k ? t('memproses') : t('payout.loadRekening')}
                  </button>
                  {rekening.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {rekening.map((r) => (
                        <div key={r.id} className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={!r.terverifikasi || aksiId === k}
                            onClick={() => void jalankanPayout(g.tipe, g.id, r.id)}
                            className="rounded-lg border border-primary-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-primary-600"
                          >
                            {r.nomor_mask} {r.terverifikasi ? '✓' : t('payout.belumVerifikasi')}
                          </button>
                          {!r.terverifikasi && (
                            <button
                              type="button"
                              onClick={() => void verifikasiRek(r.id)}
                              className="text-xs text-primary-600 hover:underline dark:text-primary-400"
                            >
                              {t('payout.verifikasiRekening')}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {payout.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-neutral-500" aria-hidden />
              <h4 className="text-sm font-semibold">{t('payout.riwayat')}</h4>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
              {payout.slice(0, 8).map((p) => (
                <li key={p.id}>
                  {formatHarga(p.jumlah, 'per_paket')} · {labelStatusPayout(p.status)} · {labelPenyedia(p.penyedia.tipe)}
                  {p.dibuat_pada && (
                    <> · {formatTanggal(p.dibuat_pada, locale === 'en' ? 'en-US' : 'id-ID')}</>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}

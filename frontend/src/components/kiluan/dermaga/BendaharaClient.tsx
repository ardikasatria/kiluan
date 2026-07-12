'use client'

import BuktiTransferThumb from '@/components/kiluan/dermaga/BuktiTransferThumb'
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
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
  /** Tampilkan subset: pembayaran (konfirmasi) atau payout saja; default semua. */
  mode?: 'full' | 'pembayaran' | 'payout'
}

function kunciPenyedia(tipe: string, id: string) {
  return `${tipe}:${id}`
}

export default function BendaharaClient({ desaSlug, mode = 'full' }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.bendahara')
  const tr = t as unknown as (key: string) => string
  const [antrean, setAntrean] = useState<PembayaranDto[]>([])
  const [transaksiDirilis, setTransaksiDirilis] = useState<TransaksiDto[]>([])
  const [transaksiDitahan, setTransaksiDitahan] = useState<TransaksiDto[]>([])
  const [rekeningMap, setRekeningMap] = useState<Record<string, RekeningDto[]>>({})
  const [rekeningLoading, setRekeningLoading] = useState<string | null>(null)
  const [payout, setPayout] = useState<PayoutDto[]>([])
  const [payoutPending, setPayoutPending] = useState<PayoutDto[]>([])
  const [loading, setLoading] = useState(true)
  const [aksiId, setAksiId] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const [a, tDirilis, tDitahan, p, pAntri] = await Promise.all([
        daftarPembayaranAntrean(desaSlug),
        getTransaksi(desaSlug, { status: 'dirilis' }),
        getTransaksi(desaSlug, { status: 'tertahan_escrow' }),
        getPayout(desaSlug),
        getPayout(desaSlug, { status: 'antri' }).catch(() => ({ item: [] as PayoutDto[] })),
      ])
      setAntrean(a.item)
      setTransaksiDirilis(tDirilis.item)
      setTransaksiDitahan(tDitahan.item)
      setPayout(p.item)
      setPayoutPending(pAntri.item)
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

  async function buatPayoutManual(ptipe: string, pid: string, rekeningId: string, rekeningMask: string) {
    if (!confirm(t('payout.konfirmasiDialog', { rekening: rekeningMask }))) return
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
      setSukses(t('payout.dibuat', { id: po.id.slice(0, 8) }))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setAksiId(null)
    }
  }

  async function transisiPo(payoutId: string, aksi: 'tandai_berhasil' | 'tandai_gagal') {
    const konfirmasi =
      aksi === 'tandai_berhasil' ? t('payout.konfirmasiBerhasil') : t('payout.konfirmasiGagal')
    if (!confirm(konfirmasi)) return
    setGalat(null)
    setSukses(null)
    setAksiId(payoutId)
    const idem = kunciIdempotensi(`payout-tr-${payoutId}-${aksi}`)
    try {
      await transisiPayout(desaSlug, payoutId, aksi, idem)
      hapusKunciIdempotensi(`payout-tr-${payoutId}-${aksi}`)
      setSukses(aksi === 'tandai_berhasil' ? t('payout.sukses') : t('payout.gagalDicatat'))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setAksiId(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
  }

  const tampilEscrow = mode === 'full' || mode === 'pembayaran'
  const tampilKonfirmasi = mode === 'full' || mode === 'pembayaran'
  const tampilPayout = mode === 'full' || mode === 'payout'

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

      {tampilEscrow && (
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { key: 'menunggu', val: ringkasanEscrow.menungguKonfirmasi, hint: t('escrow.menungguHint', { count: antrean.length }), color: 'text-primary-800 dark:text-primary-200' },
          { key: 'ditahan', val: ringkasanEscrow.ditahan, hint: t('escrow.ditahanHint'), color: 'text-amber-800 dark:text-amber-200' },
          { key: 'dirilis', val: ringkasanEscrow.dirilis, hint: t('escrow.dirilisHint'), color: 'text-kiluan-sea dark:text-kiluan-mint' },
        ].map((card) => (
          <div
            key={card.key}
            className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800/40"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {tr(`escrow.${card.key}`)}
            </p>
            <p className={clsx('mt-1 text-xl font-bold', card.color)}>
              {formatHarga(card.val, 'per_paket')}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{card.hint}</p>
          </div>
        ))}
      </section>
      )}

      {mode === 'full' && (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t('refundLink')}{' '}
        <Link href={`/${desaSlug}/kelola/refund`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          {t('refundCta')}
        </Link>
        {' · '}
        <Link href={`/${desaSlug}/kelola/pembayaran`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          {t('pembayaranCta')}
        </Link>
        {' · '}
        <Link href={`/${desaSlug}/kelola/payout`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          {t('payoutCta')}
        </Link>
        {' · '}
        <Link href={`/${desaSlug}/kelola/transaksi`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          {t('transaksiCta')}
        </Link>
      </p>
      )}

      {mode === 'pembayaran' && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          <Link href={`/${desaSlug}/kelola/bendahara`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            {t('kembaliBendahara')}
          </Link>
          {' · '}
          <Link href={`/${desaSlug}/kelola/payout`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            {t('payoutCta')}
          </Link>
        </p>
      )}

      {mode === 'payout' && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          <Link href={`/${desaSlug}/kelola/bendahara`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            {t('kembaliBendahara')}
          </Link>
          {' · '}
          <Link href={`/${desaSlug}/kelola/pembayaran`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            {t('pembayaranCta')}
          </Link>
        </p>
      )}

      {tampilKonfirmasi && (
      <section>
        <div className="flex items-center gap-2">
          <CheckBadgeIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t('konfirmasi.title')}</h3>
        </div>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('konfirmasi.desc')}</p>
        {antrean.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{t('konfirmasi.empty')}</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700">
            {antrean.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {formatHarga(p.jumlah, 'per_paket')}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {p.metode} · ID {p.id.slice(0, 8)}…
                    </p>
                  </div>
                  {p.bukti_media_id && (
                    <BuktiTransferThumb desaSlug={desaSlug} mediaId={p.bukti_media_id} />
                  )}
                  {!p.bukti_media_id && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">{t('konfirmasi.belumAda')}</span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!p.bukti_media_id || aksiId === p.id}
                  onClick={() => void konfirmasi(p)}
                  className="rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-primary-800 dark:bg-primary-600"
                >
                  {aksiId === p.id ? t('memproses') : t('konfirmasi.confirm')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      {tampilPayout && (
      <section>
        <div className="flex items-center gap-2">
          <BanknotesIcon className="size-5 text-kiluan-sea dark:text-kiluan-mint" aria-hidden />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t('payout.title')}</h3>
        </div>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('payout.desc')}</p>

        {payoutPending.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">{t('payout.antrian')}</h4>
            <ul className="mt-2 space-y-2">
              {payoutPending.map((po) => (
                <li key={po.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {formatHarga(po.jumlah, 'per_paket')} → {po.rekening?.nomor_mask ?? '—'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={aksiId === po.id}
                      onClick={() => void transisiPo(po.id, 'tandai_berhasil')}
                      className="rounded-full bg-primary-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {t('payout.tandaiBerhasil')}
                    </button>
                    <button
                      type="button"
                      disabled={aksiId === po.id}
                      onClick={() => void transisiPo(po.id, 'tandai_gagal')}
                      className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-700 dark:border-red-800 dark:text-red-300"
                    >
                      {t('payout.tandaiGagal')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {grupDirilis.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{t('payout.empty')}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {grupDirilis.map((g) => {
              const k = kunciPenyedia(g.tipe, g.id)
              const rekening = rekeningMap[k] ?? []
              return (
                <li key={k} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700 dark:bg-neutral-900/30">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
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
                            onClick={() => void buatPayoutManual(g.tipe, g.id, r.id, r.nomor_mask)}
                            className="rounded-lg border border-primary-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-primary-600 dark:text-primary-200"
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
              <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t('payout.riwayat')}</h4>
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
      )}
    </div>
  )
}

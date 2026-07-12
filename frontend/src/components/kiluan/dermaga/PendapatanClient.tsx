'use client'

import { pesanGalat } from '@/lib/api/galat'
import { getUmkmKelola } from '@/lib/api/pasar'
import { buatRekening, getRekening, getTransaksi } from '@/lib/api/uang'
import type { RekeningDto, TransaksiDto, UmkmRingkas } from '@/lib/api/types'
import { formatHarga } from '@/lib/kiluan/pasar'
import { formatTanggal } from '@/lib/kiluan/lencana'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  /** pengelola = pilih UMKM desa; umkm = UMKM milik user (default pertama) */
  mode?: 'pengelola' | 'umkm'
}

export default function PendapatanClient({ desaSlug, mode = 'pengelola' }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.pendapatan')
  const tr = t as unknown as (key: string) => string
  const [daftarUmkm, setDaftarUmkm] = useState<UmkmRingkas[]>([])
  const [umkmId, setUmkmId] = useState<string | null>(null)
  const [transaksi, setTransaksi] = useState<TransaksiDto[]>([])
  const [rekening, setRekening] = useState<RekeningDto[]>([])
  const [form, setForm] = useState({ nomor: '', nama_pemilik: '', bank_kode: 'BCA' })
  const [loading, setLoading] = useState(true)
  const [menyimpan, setMenyimpan] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const umkm = daftarUmkm.find((u) => u.id === umkmId) ?? null

  const muatUmkm = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const u = await getUmkmKelola(desaSlug)
      setDaftarUmkm(u.item)
      setUmkmId((prev) => prev ?? u.item[0]?.id ?? null)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  const muatDetail = useCallback(async () => {
    if (!umkmId) return
    setGalat(null)
    try {
      const [tRes, r] = await Promise.all([
        getTransaksi(desaSlug, { penyedia_tipe: 'umkm', penyedia_id: umkmId }),
        getRekening(desaSlug, { penyedia_tipe: 'umkm', penyedia_id: umkmId }),
      ])
      setTransaksi(tRes.item)
      setRekening(r.item)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    }
  }, [desaSlug, umkmId, locale])

  useEffect(() => {
    void muatUmkm()
  }, [muatUmkm])

  useEffect(() => {
    if (umkmId) void muatDetail()
  }, [umkmId, muatDetail])

  async function simpanRekening(e: React.FormEvent) {
    e.preventDefault()
    if (!umkmId) return
    setGalat(null)
    setSukses(null)
    setMenyimpan(true)
    try {
      await buatRekening(desaSlug, {
        penyedia_tipe: 'umkm',
        penyedia_id: umkmId,
        jenis: 'bank',
        nomor: form.nomor,
        nama_pemilik: form.nama_pemilik,
        bank_kode: form.bank_kode,
      })
      setForm({ nomor: '', nama_pemilik: '', bank_kode: 'BCA' })
      setSukses(t('rekeningSukses'))
      await muatDetail()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMenyimpan(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">{t('loading')}</p>
  }

  if (daftarUmkm.length === 0) {
    return <p className="text-sm text-neutral-500">{t('noUmkm')}</p>
  }

  const totalNeto = transaksi.reduce((s, tx) => s + tx.neto_penyedia, 0)
  const totalReinvest = transaksi.reduce((s, tx) => s + tx.porsi_reinvestasi, 0)
  const totalBruto = transaksi.reduce((s, tx) => s + tx.bruto, 0)

  return (
    <div className="space-y-8">
      {mode === 'pengelola' && daftarUmkm.length > 1 && (
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('pilihUmkm')}</label>
          <select
            value={umkmId ?? ''}
            onChange={(e) => setUmkmId(e.target.value)}
            className="mt-1 block w-full max-w-md rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          >
            {daftarUmkm.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nama}
              </option>
            ))}
          </select>
        </div>
      )}

      {umkm && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
              <p className="text-xs uppercase tracking-wide text-neutral-500">{t('statBruto')}</p>
              <p className="mt-1 text-lg font-bold">{formatHarga(totalBruto, 'per_paket')}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
              <p className="text-xs uppercase tracking-wide text-neutral-500">{t('statNeto')}</p>
              <p className="mt-1 text-lg font-bold text-primary-800 dark:text-primary-200">
                {formatHarga(totalNeto, 'per_paket')}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
              <p className="text-xs uppercase tracking-wide text-neutral-500">{t('statReinvest')}</p>
              <p className="mt-1 text-lg font-bold text-kiluan-sea">{formatHarga(totalReinvest, 'per_paket')}</p>
            </div>
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t('ringkasan', {
              neto: formatHarga(totalNeto, 'per_paket'),
              reinvest: formatHarga(totalReinvest, 'per_paket'),
            })}
          </p>
        </>
      )}

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}
      {sukses && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
          {sukses}
        </p>
      )}

      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
        <h3 className="font-semibold">{t('ledger')}</h3>
        {transaksi.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">{t('emptyTransaksi')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
            {transaksi.map((tx) => (
              <li key={tx.id} className="flex justify-between gap-4 py-3">
                <div>
                  <p className="font-medium capitalize">
                    {tx.jenis} · {tr(`statusTransaksi.${tx.status}`) || tx.status}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {t('bruto')} {formatHarga(tx.bruto, 'per_paket')} · {t('fee')}{' '}
                    {formatHarga(tx.fee_platform, 'per_paket')}
                  </p>
                  <p className="text-xs font-medium text-kiluan-sea dark:text-kiluan-mint">
                    {t('reinvestasi')} {formatHarga(tx.porsi_reinvestasi, 'per_paket')}
                  </p>
                  {tx.dibuat_pada && (
                    <time className="text-xs text-neutral-400" dateTime={tx.dibuat_pada}>
                      {formatTanggal(tx.dibuat_pada, locale === 'en' ? 'en-US' : 'id-ID')}
                    </time>
                  )}
                </div>
                <p className="shrink-0 font-semibold">{formatHarga(tx.neto_penyedia, 'per_paket')}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
        <h3 className="font-semibold">{t('rekening')}</h3>
        <p className="mt-1 text-xs text-neutral-500">{t('rekeningHint')}</p>
        {rekening.length > 0 && (
          <ul className="mt-3 space-y-2 text-sm">
            {rekening.map((r) => (
              <li key={r.id} className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-800/50">
                {r.nomor_mask} · {r.nama_pemilik}{' '}
                {r.terverifikasi ? (
                  <span className="text-green-600 dark:text-green-400">{t('terverifikasi')}</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">{t('menungguVerifikasi')}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={(e) => void simpanRekening(e)} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input
            placeholder={t('placeholderNomor')}
            value={form.nomor}
            onChange={(e) => setForm((f) => ({ ...f, nomor: e.target.value }))}
            className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            required
          />
          <input
            placeholder={t('placeholderNama')}
            value={form.nama_pemilik}
            onChange={(e) => setForm((f) => ({ ...f, nama_pemilik: e.target.value }))}
            className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            required
          />
          <button
            type="submit"
            disabled={menyimpan}
            className="rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2 sm:w-fit hover:bg-primary-800"
          >
            {menyimpan ? t('menyimpan') : t('tambahRekening')}
          </button>
        </form>
      </section>
    </div>
  )
}

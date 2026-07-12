'use client'

import { daftarPesananKelola, ubahFulfillment } from '@/lib/api/dermaga'
import { pesanGalat } from '@/lib/api/galat'
import { getUmkmKelola } from '@/lib/api/pasar'
import type { PesananRingkas, UmkmRingkas } from '@/lib/api/types'
import { useAuth } from '@/contexts/AuthProvider'
import { hanyaPenyediaDermaga } from '@/lib/kiluan/kelola-akses'
import { punyaPeranDiDesa } from '@/lib/kiluan/peran'
import { formatHarga } from '@/lib/kiluan/pasar'
import { formatTanggal } from '@/lib/kiluan/lencana'
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaId?: string | null
}

const FULFILLMENT = ['menunggu', 'disiapkan', 'dikirim', 'diterima', 'diambil'] as const

export default function PesananKelolaClient({ desaSlug, desaId }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.pesanan')
  const tr = t as unknown as (key: string) => string
  const { user } = useAuth()
  const profil = user?.profil ?? null
  const scopePenyedia = hanyaPenyediaDermaga(profil, desaId)
  const scopeUmkm = scopePenyedia && punyaPeranDiDesa(profil, 'umkm', desaId)
  const [umkm, setUmkm] = useState<UmkmRingkas[]>([])
  const [umkmId, setUmkmId] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState('')
  const [pesanan, setPesanan] = useState<PesananRingkas[]>([])
  const [loading, setLoading] = useState(true)
  const [aksiId, setAksiId] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const muatUmkm = useCallback(async () => {
    try {
      const u = await getUmkmKelola(desaSlug)
      setUmkm(u.item)
      if (scopeUmkm && u.item[0]) {
        setUmkmId(u.item[0].id)
      }
    } catch {
      setUmkm([])
    }
  }, [desaSlug, scopeUmkm])

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const opts: { status?: string; penyedia_tipe?: string; penyedia_id?: string } = {}
      if (filterStatus) opts.status = filterStatus
      if (umkmId) {
        opts.penyedia_tipe = 'umkm'
        opts.penyedia_id = umkmId
      } else if (scopePenyedia && punyaPeranDiDesa(profil, 'agen', desaId)) {
        opts.penyedia_tipe = 'pengguna'
        opts.penyedia_id = profil!.id
      }
      const res = await daftarPesananKelola(desaSlug, opts)
      setPesanan(res.item)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, filterStatus, umkmId, locale, scopePenyedia, profil, desaId])

  useEffect(() => {
    void muatUmkm()
  }, [muatUmkm])

  useEffect(() => {
    void muat()
  }, [muat])

  async function updateFulfillment(pesananId: string, itemId: string, status: string) {
    setAksiId(itemId)
    setGalat(null)
    setSukses(null)
    try {
      await ubahFulfillment(desaSlug, pesananId, itemId, status)
      setSukses(t('suksesFulfillment'))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setAksiId(null)
    }
  }

  const badgeStatus = (s: string) =>
    clsx(
      'rounded-full px-2.5 py-0.5 text-xs font-medium',
      s === 'dibayar' && 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
      s === 'diproses' && 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
      s === 'selesai' && 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
      !['dibayar', 'diproses', 'selesai'].includes(s) && 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    )

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('desc')}</p>

      <div className="flex flex-wrap gap-3">
        {!scopePenyedia && (
        <select
          value={umkmId}
          onChange={(e) => setUmkmId(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          aria-label={t('filterUmkm')}
        >
          <option value="">{t('semuaPenyedia')}</option>
          {umkm.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nama}
            </option>
          ))}
        </select>
        )}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          aria-label={t('filterStatus')}
        >
          <option value="">{t('filterSemua')}</option>
          {['dibayar', 'diproses', 'selesai'].map((s) => (
            <option key={s} value={s}>
              {tr(`statusPesanan.${s}`)}
            </option>
          ))}
        </select>
      </div>

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}
      {sukses && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
          {sukses}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">{t('loading')}</p>
      ) : pesanan.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('empty')}</p>
      ) : (
        <ul className="space-y-4">
          {pesanan.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <ClipboardDocumentListIcon className="size-4 text-primary-600 dark:text-primary-400" aria-hidden />
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">{p.kode_pesanan}</p>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {formatHarga(p.total, 'per_paket')} ·{' '}
                    {p.dibuat_pada &&
                      formatTanggal(p.dibuat_pada, locale === 'en' ? 'en-US' : 'id-ID')}
                  </p>
                </div>
                <span className={badgeStatus(p.status)}>{tr(`statusPesanan.${p.status}`) || p.status}</span>
              </div>

              {(p.item ?? []).length > 0 && (
                <ul className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
                  {p.item!.map((it) => (
                    <li key={it.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {it.nama_snapshot} × {it.jumlah}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {tr(`fulfillment.${it.status_fulfillment}`) || it.status_fulfillment}
                          {it.booking && (
                            <> · {t('kodeCheckin', { kode: it.booking.kode_checkin })}</>
                          )}
                        </p>
                      </div>
                      {it.item_tipe === 'produk_jasa' && (
                        <select
                          value={it.status_fulfillment}
                          disabled={aksiId === it.id}
                          onChange={(e) => void updateFulfillment(p.id, it.id, e.target.value)}
                          className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-900"
                          aria-label={t('ubahFulfillment')}
                        >
                          {FULFILLMENT.map((f) => (
                            <option key={f} value={f}>
                              {tr(`fulfillment.${f}`)}
                            </option>
                          ))}
                        </select>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

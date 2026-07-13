'use client'

import { Link } from '@/i18n/navigation'
import { pesanGalat } from '@/lib/api/galat'
import { getDanaKonservasi, getSaldoKonservasi } from '@/lib/api/lestari'
import { getMediaDetail } from '@/lib/api/media'
import type { DanaKonservasiDto, SaldoKonservasiDto } from '@/lib/api/types'
import { useAuth } from '@/contexts/AuthProvider'
import { adalahBendahara } from '@/lib/kiluan/kelola-akses'
import { formatRupiah, formatTanggal } from '@/lib/i18n/format'
import { ArrowDownIcon, ArrowUpIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function DanaTransparansiClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('lestari.dana')
  const locale = useLocale() as 'id' | 'en'
  const { user } = useAuth()
  const bisaCatat = adalahBendahara(user?.profil ?? null)

  function labelSumber(k: string) {
    const map: Record<string, string> = {
      transaksi: t('sumber.transaksi'),
      manual: t('sumber.manual'),
      donasi: t('sumber.donasi'),
      hibah: t('sumber.hibah'),
    }
    return map[k] ?? k
  }

  const [saldo, setSaldo] = useState<SaldoKonservasiDto | null>(null)
  const [ledger, setLedger] = useState<DanaKonservasiDto[]>([])
  const [bukti, setBukti] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const [s, l] = await Promise.all([
        getSaldoKonservasi(desaSlug),
        getDanaKonservasi(desaSlug, { publik: true }),
      ])
      setSaldo(s)
      setLedger(l.item)
      const urls: Record<string, string> = {}
      await Promise.all(
        l.item
          .filter((e) => e.jenis === 'keluar' && e.bukti_media_id)
          .map(async (e) => {
            try {
              const media = await getMediaDetail(desaSlug, e.bukti_media_id!)
              if (media.url) urls[e.id] = media.url
            } catch {
              /* publik mungkin tanpa akses media */
            }
          }),
      )
      setBukti(urls)
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-emerald-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <p className="text-sm text-primary-600 dark:text-primary-400">{desaNama}</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h1>
            {bisaCatat && (
              <Link
                href={`/${desaSlug}/lestari/dana/catat`}
                className="rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white dark:bg-primary-600"
              >
                {t('catat')}
              </Link>
            )}
          </div>
          <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
        </div>
      </div>

      <div className="container max-w-3xl py-8">
        {galat && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30">{galat}</p>
        )}
        {loading ? (
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        ) : saldo ? (
          <div className="space-y-8">
            <div className="rounded-2xl border border-primary-200 bg-primary-50 p-6 dark:border-primary-800 dark:bg-primary-950/40">
              <p className="text-sm font-medium text-primary-700 dark:text-primary-300">{t('saldoLabel')}</p>
              <p className="mt-1 text-4xl font-bold text-primary-900 dark:text-primary-100">
                {formatRupiah(saldo.saldo, locale)}
              </p>
              <div className="mt-4 flex flex-wrap gap-6 text-sm">
                <span className="text-emerald-700 dark:text-emerald-300">
                  {t('totalMasuk')}: {formatRupiah(saldo.total_masuk, locale)}
                </span>
                <span className="text-red-700 dark:text-red-300">
                  {t('totalKeluar')}: {formatRupiah(saldo.total_keluar, locale)}
                </span>
              </div>
            </div>

            {Object.keys(saldo.per_kategori).length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t('perKategori')}</h2>
                <ul className="mt-3 space-y-2">
                  {Object.entries(saldo.per_kategori).map(([k, v]) => (
                    <li key={k} className="flex justify-between rounded-lg border border-neutral-200 px-4 py-2 text-sm dark:border-neutral-700">
                      <span>{k}</span>
                      <span className="font-medium">{formatRupiah(v, locale)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {Object.keys(saldo.per_sumber).length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t('perSumber')}</h2>
                <ul className="mt-3 space-y-2">
                  {Object.entries(saldo.per_sumber).map(([k, v]) => (
                    <li key={k} className="flex justify-between rounded-lg border border-neutral-200 px-4 py-2 text-sm dark:border-neutral-700">
                      <span>{labelSumber(k)}</span>
                      <span className="font-medium">{formatRupiah(v, locale)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t('timeline')}</h2>
              {ledger.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-500">{t('emptyLedger')}</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {ledger.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 rounded-full p-1.5 ${
                            e.jenis === 'masuk'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/40'
                          }`}
                        >
                          {e.jenis === 'masuk' ? (
                            <ArrowDownIcon className="size-4" />
                          ) : (
                            <ArrowUpIcon className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="font-medium text-neutral-900 dark:text-neutral-100">
                              {e.jenis === 'masuk' ? t('jenis.masuk') : t('jenis.keluar')}
                              {e.kategori ? ` · ${e.kategori}` : ''}
                            </p>
                            <p
                              className={`font-semibold ${
                                e.jenis === 'masuk' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                              }`}
                            >
                              {e.jenis === 'masuk' ? '+' : '−'}
                              {formatRupiah(e.jumlah, locale)}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-neutral-500">
                            {formatTanggal(e.tanggal, locale)}
                            {e.sumber_tipe ? ` · ${labelSumber(e.sumber_tipe)}` : ''}
                          </p>
                          {e.keterangan && (
                            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{e.keterangan}</p>
                          )}
                          {bukti[e.id] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={bukti[e.id]} alt="" className="mt-3 max-h-40 rounded-lg object-cover" />
                          ) : e.jenis === 'keluar' && e.bukti_media_id ? (
                            <p className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-500">
                              <PhotoIcon className="size-3.5" />
                              {t('buktiTersedia')}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}

'use client'

import TingkatSertifikasi from '@/components/kiluan/pasar/TingkatSertifikasi'
import { Link } from '@/i18n/navigation'
import { pesanGalat } from '@/lib/api/galat'
import { getHadiah, getKuponSaya, getPenukaranSaya } from '@/lib/api/poin'
import type { KuponRingkas, PenukaranDto } from '@/lib/api/types'
import { formatPoin, formatRupiah, formatTanggal } from '@/lib/i18n/format'
import {
  CheckIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TicketIcon,
} from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function KuponDompetClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('kupon')
  const locale = useLocale() as 'id' | 'en'
  const [kupon, setKupon] = useState<KuponRingkas[]>([])
  const [penukaran, setPenukaran] = useState<PenukaranDto[]>([])
  const [namaHadiah, setNamaHadiah] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)
  const [tersalin, setTersalin] = useState<string | null>(null)

  const tSumber = t as unknown as (key: string) => string
  function badgeSumber(sumber: string) {
    try {
      return tSumber(`sumber.${sumber}`)
    } catch {
      return sumber
    }
  }

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const [k, p, h] = await Promise.all([
        getKuponSaya(desaSlug),
        getPenukaranSaya(desaSlug),
        getHadiah(desaSlug),
      ])
      setKupon(k.item)
      setPenukaran(p.item)
      setNamaHadiah(Object.fromEntries(h.item.map((item) => [item.id, item.nama])))
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  async function salinKode(kode: string) {
    await navigator.clipboard.writeText(kode)
    setTersalin(kode)
    window.setTimeout(() => setTersalin((current) => current === kode ? null : current), 1800)
  }

  function penyediaLabel(item: string) {
    const [tipe, id] = item.split(':')
    if (tipe === 'tingkat') return { tingkat: id, text: null }
    return { tingkat: null, text: id ? t('penyedia.nama', { nama: id }) : item }
  }

  return (
    <div className="container pb-16 pt-10 sm:pt-12">
      <div className="rounded-3xl border border-primary-200/70 bg-gradient-to-br from-primary-50 via-white to-kiluan-mint/20 p-6 shadow-sm dark:border-primary-800/50 dark:from-primary-950 dark:via-neutral-900 dark:to-primary-950/60 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{desaNama}</p>
            <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h1>
            <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
          </div>
          <Link href={`/${desaSlug}/hadiah`} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-500">
            <SparklesIcon className="size-4" aria-hidden />
            {t('tukarPoinLink')}
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2" aria-label={t('loading')}>
          {[0, 1].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />)}
        </div>
      ) : galat ? (
        <p role="alert" className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{galat}</p>
      ) : (
        <div className="mt-10 space-y-12">
          <section aria-labelledby="kupon-aktif">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 id="kupon-aktif" className="text-xl font-bold text-primary-800 dark:text-primary-100">{t('activeTitle')}</h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('activeHint')}</p>
              </div>
              <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-950/60 dark:text-primary-200">{t('count', { count: kupon.filter((item) => item.status === 'aktif').length })}</span>
            </div>
            {kupon.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center dark:border-neutral-700">
                <TicketIcon className="mx-auto size-9 text-neutral-400" aria-hidden />
                <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">{t('empty')}</p>
              </div>
            ) : (
              <ul className="mt-5 grid gap-5 sm:grid-cols-2">
                {kupon.map((k) => (
                  <li key={k.id} className="relative overflow-hidden rounded-2xl border border-dashed border-primary-300 bg-white p-5 shadow-sm dark:border-primary-700 dark:bg-neutral-900">
                    <div aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-kiluan-mint/20 dark:bg-primary-700/15" />
                    <div className="relative flex items-start gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-200">
                        <TicketIcon className="size-6" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-lg font-bold tracking-wide text-neutral-900 dark:text-neutral-100">{k.kode}</p>
                            <p className="mt-1 font-semibold text-primary-700 dark:text-kiluan-mint">
                              {k.tipe_diskon === 'persen' ? t('diskonPersen', { nilai: k.nilai }) : t('diskonNominal', { nilai: formatRupiah(k.nilai, locale) })}
                            </p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${k.status === 'aktif' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                            {t(`status.${k.status}` as Parameters<typeof t>[0])}
                          </span>
                        </div>
                        <button type="button" onClick={() => void salinKode(k.kode)} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-primary-300 hover:text-primary-700 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-primary-600 dark:hover:text-primary-200">
                          {tersalin === k.kode ? <CheckIcon className="size-3.5 text-emerald-600" aria-hidden /> : <ClipboardDocumentIcon className="size-3.5" aria-hidden />}
                          {tersalin === k.kode ? t('copied') : t('copy')}
                        </button>
                        <div className="mt-4 space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                          <p>{badgeSumber(k.sumber)}</p>
                          {k.min_belanja != null && k.min_belanja > 0 && <p>{t('minBelanjaFormat', { nilai: formatRupiah(k.min_belanja, locale) })}</p>}
                          {k.berlaku_sampai && <p className="inline-flex items-center gap-1"><ClockIcon className="size-3.5" aria-hidden />{t('validUntil', { date: formatTanggal(k.berlaku_sampai, locale) })}</p>}
                          <p>{t('usage', { used: k.terpakai, limit: k.batas_pakai })}</p>
                        </div>
                        <div className="mt-4 rounded-xl bg-primary-50/70 p-3 dark:bg-primary-950/40">
                          <p className="text-xs font-semibold text-primary-800 dark:text-primary-100">{t('penyedia.title')}</p>
                          {!k.penyedia_terbatas?.length ? (
                            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{t('penyedia.all')}</p>
                          ) : (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {k.penyedia_terbatas.map((item) => {
                                const label = penyediaLabel(item)
                                return label.tingkat
                                  ? <TingkatSertifikasi key={item} tingkat={label.tingkat} />
                                  : <span key={item} className="rounded-full bg-white px-2 py-1 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{label.text}</span>
                              })}
                            </div>
                          )}
                          {k.penyedia_terbatas?.length ? <p className="mt-2 text-xs leading-relaxed text-primary-700 dark:text-primary-300">{t('penyedia.flywheel')}</p> : null}
                        </div>
                        {k.status === 'aktif' && (
                          <Link href={`/${desaSlug}/pasar`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-300">
                            <ShoppingBagIcon className="size-4" aria-hidden />
                            {t('useAtCheckout')}
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="riwayat-penukaran">
            <h2 id="riwayat-penukaran" className="text-xl font-bold text-primary-800 dark:text-primary-100">{t('historyTitle')}</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('historyHint')}</p>
            {penukaran.length === 0 ? (
              <p className="mt-5 rounded-xl bg-neutral-50 px-4 py-5 text-sm text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">{t('historyEmpty')}</p>
            ) : (
              <ul className="mt-5 divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-900">
                {penukaran.map((item) => (
                  <li key={item.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{namaHadiah[item.hadiah_id] ?? t('historyReward')}</p>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{formatTanggal(item.dibuat_pada, locale, { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="text-start sm:text-end">
                      <p className="font-semibold text-primary-700 dark:text-primary-300">-{formatPoin(item.poin_dipakai, locale)} {t('points')}</p>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t(`historyStatus.${item.status}` as Parameters<typeof t>[0])}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

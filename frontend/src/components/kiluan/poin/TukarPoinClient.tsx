'use client'

import PoinRingkas from '@/components/kiluan/lencana/PoinRingkas'
import TingkatSertifikasi from '@/components/kiluan/pasar/TingkatSertifikasi'
import { Link } from '@/i18n/navigation'
import { pesanGalat } from '@/lib/api/galat'
import { getPoinSaya } from '@/lib/api/lencana'
import { getHadiah, tukarHadiah } from '@/lib/api/poin'
import type { HadiahDto } from '@/lib/api/types'
import { formatPoin } from '@/lib/i18n/format'
import { hapusKunciIdempotensi, kunciIdempotensi } from '@/lib/kiluan/cart'
import {
  ArrowRightIcon,
  GiftIcon,
  HeartIcon,
  ShoppingBagIcon,
  TicketIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function TukarPoinClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('tukarPoin')
  const locale = useLocale() as 'id' | 'en'
  const [saldo, setSaldo] = useState(0)
  const [tingkatPengguna, setTingkatPengguna] = useState<string | null>(null)
  const [hadiah, setHadiah] = useState<HadiahDto[]>([])
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)
  const [dipilih, setDipilih] = useState<HadiahDto | null>(null)
  const [menukar, setMenukar] = useState(false)

  function tingkatMinimum(syarat: Record<string, unknown>): string | null {
    return typeof syarat.tingkat_min === 'string' ? syarat.tingkat_min : null
  }

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const [p, h] = await Promise.all([getPoinSaya(desaSlug), getHadiah(desaSlug)])
      setSaldo(p.saldo)
      setTingkatPengguna(p.tingkat ?? null)
      setHadiah(h.item.filter((item) => item.aktif))
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  async function tukar(h: HadiahDto) {
    setGalat(null)
    setSukses(null)
    setMenukar(true)
    const idem = kunciIdempotensi(`tukar-${h.id}`)
    try {
      const res = await tukarHadiah(desaSlug, h.id, idem)
      hapusKunciIdempotensi(`tukar-${h.id}`)
      setDipilih(null)
      setSukses(
        res.kupon
          ? t('suksesKupon', { kode: res.kupon.kode })
          : t('sukses'),
      )
      await muat()
    } catch (err) {
      // Kunci sengaja dipertahankan: retry aksi yang sama harus memakai key yang sama.
      setGalat(pesanGalat(err, locale))
    } finally {
      setMenukar(false)
    }
  }

  const ikonJenis = {
    kupon_diskon: TicketIcon,
    merchandise: ShoppingBagIcon,
    tiket: TicketIcon,
    donasi: HeartIcon,
  } as const
  const urutanTingkat: Record<string, number> = { tunas: 1, bahari: 2, lumba_lumba: 3 }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200/70 bg-gradient-to-br from-kiluan-mint/25 via-white to-primary-50 dark:border-neutral-800 dark:from-primary-950 dark:via-neutral-950 dark:to-neutral-900">
        <div className="container py-10 sm:py-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{desaNama}</p>
              <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
            </div>
            <div className="rounded-2xl border border-primary-200/70 bg-white/80 px-5 py-4 shadow-sm backdrop-blur dark:border-primary-800/60 dark:bg-neutral-900/70">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{t('saldoLabel')}</p>
              <PoinRingkas saldo={saldo} className="mt-1 text-xl" />
              <div className="mt-2 flex gap-3 text-xs">
                <Link href={`/${desaSlug}/saya/lencana`} className="text-primary-700 hover:underline dark:text-primary-300">
                  {t('riwayatPoin')}
                </Link>
                <Link href={`/${desaSlug}/paspor`} className="text-primary-700 hover:underline dark:text-primary-300">
                  {t('paspor')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-10">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label={t('loading')}>
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-72 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : (
          <>
            {galat && (
              <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {galat}
              </p>
            )}
            {sukses && (
              <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                {sukses}{' '}
                <Link href={`/${desaSlug}/dompet`} className="font-semibold underline">
                  {t('lihatDompet')}
                </Link>
              </p>
            )}
            {hadiah.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/50 px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900/30">
                <GiftIcon className="mx-auto size-9 text-neutral-400" aria-hidden />
                <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{t('empty')}</p>
              </div>
            ) : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {hadiah.map((h) => {
                const cukup = saldo >= h.biaya_poin
                const habis = h.stok !== null && h.stok <= 0
                const tingkat = tingkatMinimum(h.syarat)
                const syaratTerpenuhi = !tingkat || (urutanTingkat[tingkat] ?? 0) <= (tingkatPengguna ? urutanTingkat[tingkatPengguna] ?? 0 : 0)
                const Icon = ikonJenis[h.jenis as keyof typeof ikonJenis] ?? GiftIcon
                const alasan = habis ? t('alasan.habis') : !cukup ? t('alasan.saldo') : !syaratTerpenuhi ? t('alasan.syarat') : null
                return (
                  <article
                    key={h.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <div className="flex h-28 items-center justify-center bg-gradient-to-br from-primary-50 to-kiluan-mint/30 dark:from-primary-950 dark:to-primary-900/50">
                      <Icon className="size-10 text-primary-700 transition group-hover:scale-105 dark:text-primary-200" aria-hidden />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <span className="w-fit rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-700 dark:bg-primary-950/60 dark:text-primary-200">
                        {t(`jenis.${h.jenis}` as Parameters<typeof t>[0])}
                      </span>
                      <h2 className="mt-3 font-semibold text-neutral-900 dark:text-neutral-100">{h.nama}</h2>
                      {h.deskripsi && <p className="mt-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{h.deskripsi}</p>}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <p className="font-bold text-primary-700 dark:text-kiluan-mint">
                          {t('poin', { count: formatPoin(h.biaya_poin, locale) })}
                        </p>
                        {h.stok !== null && <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('stok', { count: h.stok })}</span>}
                      </div>
                      {tingkat && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                          <span>{t('syaratLabel')}</span>
                          <TingkatSertifikasi tingkat={tingkat} />
                        </div>
                      )}
                      <div className="mt-auto pt-5">
                        <button
                          type="button"
                          disabled={Boolean(alasan)}
                          onClick={() => setDipilih(h)}
                          aria-describedby={alasan ? `alasan-${h.id}` : undefined}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-600 dark:bg-primary-600 dark:hover:bg-primary-500 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400"
                        >
                          {t('tukar')}
                          {!alasan && <ArrowRightIcon className="size-4" aria-hidden />}
                        </button>
                        {alasan && <p id={`alasan-${h.id}`} className="mt-2 text-center text-xs text-neutral-500 dark:text-neutral-400">{alasan}</p>}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>}
          </>
        )}
      </div>

      {dipilih && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/55 p-4 backdrop-blur-sm" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="konfirmasi-tukar" className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary-600 dark:text-primary-300">{t('confirm.eyebrow')}</p>
                <h2 id="konfirmasi-tukar" className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">{t('confirm.title')}</h2>
              </div>
              <button type="button" onClick={() => setDipilih(null)} disabled={menukar} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label={t('confirm.close')}>
                <XMarkIcon className="size-5" aria-hidden />
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              {t('confirm.body', { nama: dipilih.nama, poin: formatPoin(dipilih.biaya_poin, locale) })}
            </p>
            <div className="mt-4 rounded-xl bg-primary-50 p-4 dark:bg-primary-950/40">
              <div className="flex justify-between text-sm"><span>{t('confirm.saldo')}</span><strong>{formatPoin(saldo, locale)}</strong></div>
              <div className="mt-2 flex justify-between text-sm"><span>{t('confirm.biaya')}</span><strong>-{formatPoin(dipilih.biaya_poin, locale)}</strong></div>
            </div>
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{t('confirm.serverNote')}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDipilih(null)} disabled={menukar} className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800">{t('confirm.cancel')}</button>
              <button type="button" onClick={() => void tukar(dipilih)} disabled={menukar} className={clsx('rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-500', menukar && 'cursor-wait opacity-60')}>{menukar ? t('confirm.processing') : t('confirm.submit')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

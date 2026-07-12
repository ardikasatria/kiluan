'use client'

import { pesanGalat } from '@/lib/api/galat'
import { buatHadiah, getHadiah, ubahHadiah } from '@/lib/api/poin'
import type { HadiahDto } from '@/lib/api/types'
import { formatPoin } from '@/lib/i18n/format'
import { GiftIcon, PlusIcon, PowerIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

export default function KelolaHadiahClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.hadiah')
  const tr = t as unknown as (key: string) => string
  const [hadiah, setHadiah] = useState<HadiahDto[]>([])
  const [loading, setLoading] = useState(true)
  const [menyimpan, setMenyimpan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const h = await getHadiah(desaSlug)
      setHadiah(h.item)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  async function tambahHadiah(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setGalat(null)
    setSukses(null)
    setMenyimpan('hadiah')
    try {
      await buatHadiah(desaSlug, {
        nama: String(fd.get('nama')),
        jenis: String(fd.get('jenis')),
        biaya_poin: Number(fd.get('biaya')),
        deskripsi: String(fd.get('deskripsi') || '') || undefined,
        stok: fd.get('stok') ? Number(fd.get('stok')) : undefined,
        syarat: fd.get('tingkat') ? { tingkat_min: String(fd.get('tingkat')) } : {},
      })
      e.currentTarget.reset()
      setSukses(t('sukses.hadiah'))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMenyimpan(null)
    }
  }

  async function ubahStatus(item: HadiahDto) {
    setGalat(null)
    setSukses(null)
    setMenyimpan(item.id)
    try {
      await ubahHadiah(desaSlug, item.id, { aktif: !item.aktif })
      setSukses(item.aktif ? t('sukses.nonaktif') : t('sukses.aktif'))
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
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
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
        {hadiah.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <GiftIcon className="mx-auto size-8 text-neutral-400" aria-hidden />
            <p className="mt-2 text-sm text-neutral-500">{t('emptyHadiah')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {hadiah.map((h) => (
              <li
                key={h.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{h.nama}</p>
                    <span className={h.aktif ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200' : 'rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}>
                      {h.aktif ? t('status.aktif') : t('status.nonaktif')}
                    </span>
                  </div>
                  {h.deskripsi && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{h.deskripsi}</p>}
                  <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                    {formatPoin(h.biaya_poin, locale as 'id' | 'en')} {t('poinSuffix')} · {tr(`jenis.${h.jenis}`)}
                    {h.stok != null ? ` · ${t('stok', { count: h.stok })}` : ` · ${t('stokTakTerbatas')}`}
                  </p>
                </div>
                <button type="button" onClick={() => void ubahStatus(h)} disabled={menyimpan === h.id} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:border-primary-300 hover:text-primary-700 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:border-primary-600 dark:hover:text-primary-200">
                  <PowerIcon className="size-4" aria-hidden />
                  {menyimpan === h.id ? t('menyimpan') : h.aktif ? t('nonaktifkan') : t('aktifkan')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-200">
            <PlusIcon className="size-5" aria-hidden />
          </div>
          <div>
            <h3 className="font-semibold text-primary-800 dark:text-primary-100">{t('formTitle')}</h3>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('formHint')}</p>
          </div>
        </div>
        <form onSubmit={(e) => void tambahHadiah(e)} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.nama')}
            <input name="nama" placeholder={t('placeholder.nama')} required className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950" />
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.jenis')}
            <select name="jenis" className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950">
              <option value="merchandise">{t('jenis.merchandise')}</option>
              <option value="kupon_diskon">{t('jenis.kupon_diskon')}</option>
              <option value="tiket">{t('jenis.tiket')}</option>
              <option value="donasi">{t('jenis.donasi')}</option>
            </select>
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.biaya')}
            <input name="biaya" type="number" min={1} placeholder={t('placeholder.biaya')} required className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950" />
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.stok')}
            <input name="stok" type="number" min={0} placeholder={t('placeholder.stok')} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950" />
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 sm:col-span-2">
            {t('field.deskripsi')}
            <textarea name="deskripsi" rows={3} placeholder={t('placeholder.deskripsi')} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950" />
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 sm:col-span-2">
            {t('field.tingkat')}
            <select name="tingkat" className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950">
              <option value="">{t('tingkat.semua')}</option>
              <option value="tunas">{t('tingkat.tunas')}</option>
              <option value="bahari">{t('tingkat.bahari')}</option>
              <option value="lumba_lumba">{t('tingkat.lumba_lumba')}</option>
            </select>
            <span className="mt-1 block text-xs font-normal text-neutral-500 dark:text-neutral-400">{t('field.tingkatHint')}</span>
          </label>
          <button type="submit" disabled={menyimpan === 'hadiah'} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50 sm:col-span-2 sm:w-fit dark:bg-primary-600 dark:hover:bg-primary-500">
            <PlusIcon className="size-4" aria-hidden />
            {menyimpan === 'hadiah' ? t('menyimpan') : t('tambahHadiah')}
          </button>
        </form>
      </section>
    </div>
  )
}

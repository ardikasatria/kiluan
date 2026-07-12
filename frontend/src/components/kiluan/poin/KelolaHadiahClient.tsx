'use client'

import { pesanGalat } from '@/lib/api/galat'
import { buatHadiah, buatKuponKampanye, getHadiah } from '@/lib/api/poin'
import type { HadiahDto } from '@/lib/api/types'
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
  const [menyimpan, setMenyimpan] = useState<'hadiah' | 'kupon' | null>(null)
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

  async function tambahKupon(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setGalat(null)
    setSukses(null)
    setMenyimpan('kupon')
    try {
      await buatKuponKampanye(desaSlug, {
        kode: String(fd.get('kode')),
        nilai: Number(fd.get('nilai')),
        tipe_diskon: 'nominal',
        min_belanja: fd.get('min') ? Number(fd.get('min')) : undefined,
      })
      e.currentTarget.reset()
      setSukses(t('sukses.kupon'))
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
    <div className="space-y-10">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}
      {sukses && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
          {sukses}
        </p>
      )}

      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
        <h3 className="font-semibold">{t('katalog')}</h3>
        {hadiah.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">{t('emptyHadiah')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {hadiah.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-800/50"
              >
                <div>
                  <p className="font-medium">{h.nama}</p>
                  {h.deskripsi && <p className="text-xs text-neutral-500">{h.deskripsi}</p>}
                </div>
                <span className="text-xs text-neutral-600 dark:text-neutral-400">
                  {h.biaya_poin} {t('poinSuffix')} · {tr(`jenis.${h.jenis}`)}
                  {h.stok != null ? ` · ${t('stok', { count: h.stok })}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={(e) => void tambahHadiah(e)} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input
            name="nama"
            placeholder={t('placeholder.nama')}
            required
            className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          />
          <select name="jenis" className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900">
            <option value="merchandise">{t('jenis.merchandise')}</option>
            <option value="kupon_diskon">{t('jenis.kupon_diskon')}</option>
            <option value="tiket">{t('jenis.tiket')}</option>
          </select>
          <input
            name="biaya"
            type="number"
            min={1}
            placeholder={t('placeholder.biaya')}
            required
            className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          />
          <input
            name="stok"
            type="number"
            min={0}
            placeholder={t('placeholder.stok')}
            className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          />
          <input
            name="deskripsi"
            placeholder={t('placeholder.deskripsi')}
            className="rounded-lg border px-3 py-2 text-sm sm:col-span-2 dark:border-neutral-600 dark:bg-neutral-900"
          />
          <button
            type="submit"
            disabled={menyimpan === 'hadiah'}
            className="rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2 sm:w-fit"
          >
            {menyimpan === 'hadiah' ? t('menyimpan') : t('tambahHadiah')}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
        <h3 className="font-semibold">{t('kuponKampanye')}</h3>
        <p className="mt-1 text-xs text-neutral-500">{t('kuponHint')}</p>
        <form onSubmit={(e) => void tambahKupon(e)} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input
            name="kode"
            placeholder={t('placeholder.kode')}
            required
            className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          />
          <input
            name="nilai"
            type="number"
            min={1}
            placeholder={t('placeholder.nilai')}
            required
            className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          />
          <input
            name="min"
            type="number"
            min={0}
            placeholder={t('placeholder.min')}
            className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          />
          <button
            type="submit"
            disabled={menyimpan === 'kupon'}
            className="rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2 sm:w-fit"
          >
            {menyimpan === 'kupon' ? t('menyimpan') : t('buatKupon')}
          </button>
        </form>
      </section>
    </div>
  )
}

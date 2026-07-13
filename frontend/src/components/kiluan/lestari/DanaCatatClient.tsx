'use client'

import { Link } from '@/i18n/navigation'
import { pesanGalat } from '@/lib/api/galat'
import { catatDanaKonservasi, unggahBuktiFoto } from '@/lib/api/lestari'
import type { DanaCatatPayload } from '@/lib/api/types'
import { useAuth } from '@/contexts/AuthProvider'
import { adalahBendahara } from '@/lib/kiluan/kelola-akses'
import { uuid7 } from '@/lib/kiluan/uuid7'
import { PhotoIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

const KATEGORI_KELUAR = ['operasional', 'rehabilitasi', 'penelitian', 'komunitas', 'lainnya'] as const

interface Props {
  desaSlug: string
  desaNama: string
}

export default function DanaCatatClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('lestari.dana')
  const locale = useLocale() as 'id' | 'en'
  const { user, isLoading: authLoading } = useAuth()
  const boleh = adalahBendahara(user?.profil ?? null)
  const [jenis, setJenis] = useState<'masuk' | 'keluar'>('keluar')
  const [jumlah, setJumlah] = useState('')
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10))
  const [kategori, setKategori] = useState<string>('operasional')
  const [keterangan, setKeterangan] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [proses, setProses] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState(false)

  async function kirim() {
    if (!jumlah) return
    setProses(true)
    setGalat(null)
    setSukses(false)
    try {
      let buktiMediaId: string | undefined
      if (jenis === 'keluar') {
        if (!foto) {
          setGalat(t('errors.buktiWajib'))
          return
        }
        buktiMediaId = await unggahBuktiFoto(desaSlug, foto)
      }
      const body: DanaCatatPayload = {
        jenis,
        jumlah: Number(jumlah),
        tanggal,
        kategori: jenis === 'keluar' ? kategori : undefined,
        sumber_tipe: jenis === 'masuk' ? 'manual' : undefined,
        keterangan: keterangan || undefined,
        bukti_media_id: buktiMediaId,
      }
      await catatDanaKonservasi(desaSlug, body, uuid7())
      setSukses(true)
      setJumlah('')
      setKeterangan('')
      setFoto(null)
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    } finally {
      setProses(false)
    }
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-emerald-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <p className="text-sm text-primary-600 dark:text-primary-400">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">{t('catatTitle')}</h1>
          <Link href={`/${desaSlug}/lestari/dana`} className="mt-3 inline-block text-sm text-primary-600 hover:underline dark:text-primary-400">
            {t('kembaliTransparansi')}
          </Link>
        </div>
      </div>

      <div className="container max-w-lg py-8">
        {authLoading ? (
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        ) : !boleh ? (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30">
            {t('errors.forbidden')}{' '}
            <Link href="/masuk" className="font-medium underline">
              Masuk
            </Link>
          </p>
        ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            void kirim()
          }}
        >
          {galat && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30">{galat}</p>
          )}
          {sukses && (
            <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30">{t('saved')}</p>
          )}

          <fieldset className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="jenis" checked={jenis === 'keluar'} onChange={() => setJenis('keluar')} />
              {t('jenis.keluar')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="jenis" checked={jenis === 'masuk'} onChange={() => setJenis('masuk')} />
              {t('jenis.masuk')}
            </label>
          </fieldset>

          <label className="block text-sm">
            <span className="font-medium">{t('jumlah')}</span>
            <input
              type="number"
              min={1}
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">{t('tanggal')}</span>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
              required
            />
          </label>

          {jenis === 'keluar' && (
            <label className="block text-sm">
              <span className="font-medium">{t('kategori')}</span>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
              >
                {KATEGORI_KELUAR.map((k) => (
                  <option key={k} value={k}>
                    {t(`kategoriOpsi.${k}`)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-sm">
            <span className="font-medium">{t('keterangan')}</span>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
            />
          </label>

          {jenis === 'keluar' && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600">
              <PhotoIcon className="size-4" />
              {foto ? foto.name : t('fotoBukti')}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} required />
            </label>
          )}

          <button
            type="submit"
            disabled={proses}
            className="w-full rounded-xl bg-primary-700 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-60 dark:bg-primary-600"
          >
            {proses ? t('saving') : t('submit')}
          </button>
        </form>
        )}
      </div>
    </div>
  )
}

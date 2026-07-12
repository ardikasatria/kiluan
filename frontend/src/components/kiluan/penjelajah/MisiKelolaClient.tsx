'use client'

import { pesanGalat } from '@/lib/api/galat'
import {
  buatMisi,
  getMisi,
  getMisiDetail,
  getStasiunKelola,
  ubahMisi,
} from '@/lib/api/penjelajah'
import type { MisiDetail, MisiRingkas, StasiunLestariDto } from '@/lib/api/types'
import { metodeVerifikasi } from '@/lib/kiluan/penjelajah'
import { MapPinIcon, PlusIcon, PowerIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

const KATEGORI = ['mangrove', 'karang', 'sampah', 'lumba', 'budaya'] as const
const METODE = ['otomatis', 'qr_checkin', 'foto_geotag', 'konfirmasi_pemandu'] as const

const inputCls =
  'mt-1.5 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950'

export default function MisiKelolaClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.misi')
  const [item, setItem] = useState<MisiRingkas[]>([])
  const [stasiun, setStasiun] = useState<StasiunLestariDto[]>([])
  const [pilihId, setPilihId] = useState<string | null>(null)
  const [detail, setDetail] = useState<MisiDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [menyimpan, setMenyimpan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)
  const [mode, setMode] = useState<'buat' | 'edit'>('buat')

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const [m, s] = await Promise.all([getMisi(desaSlug), getStasiunKelola(desaSlug)])
      setItem(m.item)
      setStasiun(s.item)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en') || t('errors.load'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale, t])

  useEffect(() => {
    void muat()
  }, [muat])

  useEffect(() => {
    if (!pilihId || mode !== 'edit') {
      if (mode === 'buat') setDetail(null)
      return
    }
    void getMisiDetail(desaSlug, pilihId)
      .then((res) => setDetail(res.misi))
      .catch((err) => setGalat(pesanGalat(err, locale as 'id' | 'en')))
  }, [pilihId, desaSlug, mode, locale])

  function mulaiEdit(m: MisiRingkas) {
    setMode('edit')
    setPilihId(m.id)
    setSukses(null)
    setGalat(null)
  }

  function mulaiBuat() {
    setMode('buat')
    setPilihId(null)
    setDetail(null)
    setSukses(null)
    setGalat(null)
  }

  function payloadDariForm(fd: FormData) {
    const metode = String(fd.get('metode') || 'otomatis')
    const butuhFoto = fd.get('bukti_foto') === 'on'
    const stasiunId = String(fd.get('stasiun_id') || '')
    const dampakRaw = String(fd.get('dampak') || '').trim()
    let dampak_template: Record<string, number> = {}
    if (dampakRaw) {
      for (const part of dampakRaw.split(',')) {
        const [k, v] = part.split(':').map((x) => x.trim())
        if (k && v && !Number.isNaN(Number(v))) dampak_template[k] = Number(v)
      }
    }
    return {
      judul: String(fd.get('judul')),
      deskripsi: String(fd.get('deskripsi') || '') || undefined,
      jenis: String(fd.get('jenis')) as 'belajar' | 'aksi',
      kategori: String(fd.get('kategori')),
      poin: Number(fd.get('poin') || 0),
      stasiun_id: stasiunId || null,
      syarat_verifikasi: {
        metode,
        ...(butuhFoto ? { bukti: { foto: true } } : {}),
      },
      dampak_template,
    }
  }

  async function simpanBuat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setMenyimpan('form')
    setGalat(null)
    setSukses(null)
    try {
      const kode = String(fd.get('kode') || '').trim()
      await buatMisi(desaSlug, {
        ...payloadDariForm(fd),
        ...(kode ? { kode } : {}),
      })
      e.currentTarget.reset()
      setSukses(t('sukses.buat'))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMenyimpan(null)
    }
  }

  async function simpanEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!pilihId) return
    const fd = new FormData(e.currentTarget)
    setMenyimpan('form')
    setGalat(null)
    setSukses(null)
    try {
      await ubahMisi(desaSlug, pilihId, payloadDariForm(fd))
      setSukses(t('sukses.ubah'))
      await muat()
      const res = await getMisiDetail(desaSlug, pilihId)
      setDetail(res.misi)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMenyimpan(null)
    }
  }

  async function toggleAktif(m: MisiRingkas) {
    setMenyimpan(m.id)
    setGalat(null)
    setSukses(null)
    try {
      await ubahMisi(desaSlug, m.id, { aktif: !m.aktif })
      setSukses(m.aktif ? t('sukses.nonaktif') : t('sukses.aktif'))
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

  const formDefaults = mode === 'edit' && detail ? detail : null
  const metodeDefault = formDefaults
    ? metodeVerifikasi(formDefaults.syarat_verifikasi)
    : 'otomatis'
  const buktiFotoDefault = Boolean(
    (formDefaults?.syarat_verifikasi?.bukti as { foto?: boolean } | undefined)?.foto,
  )
  const dampakDefault = formDefaults
    ? Object.entries(formDefaults.dampak_template)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ')
    : ''

  return (
    <div className="space-y-8">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
          {galat}
        </p>
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
        {item.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-500">{t('empty')}</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {item.map((m) => (
              <li
                key={m.id}
                className={clsx(
                  'flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between',
                  pilihId === m.id && mode === 'edit' && 'bg-primary-50/40 dark:bg-primary-950/20',
                )}
              >
                <button type="button" onClick={() => mulaiEdit(m)} className="min-w-0 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{m.judul}</p>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {t(`jenis.${m.jenis}`)}
                    </span>
                    <span
                      className={
                        m.aktif
                          ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'
                          : 'rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                      }
                    >
                      {m.aktif ? t('status.aktif') : t('status.nonaktif')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {m.kode} · {t(`kategori.${m.kategori}` as 'kategori.lumba')} · {m.poin}{' '}
                    {t('poinSuffix')}
                    {m.stasiun ? ` · ${m.stasiun.nama}` : ''}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => void toggleAktif(m)}
                  disabled={menyimpan === m.id}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:border-primary-300 hover:text-primary-700 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200"
                >
                  <PowerIcon className="size-4" aria-hidden />
                  {menyimpan === m.id ? t('menyimpan') : m.aktif ? t('nonaktifkan') : t('aktifkan')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-200">
              {mode === 'buat' ? (
                <PlusIcon className="size-5" aria-hidden />
              ) : (
                <MapPinIcon className="size-5" aria-hidden />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-primary-800 dark:text-primary-100">
                {mode === 'buat' ? t('formBuat') : t('formEdit')}
              </h3>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {mode === 'buat' ? t('formBuatHint') : t('formEditHint')}
              </p>
            </div>
          </div>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={mulaiBuat}
              className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-semibold dark:border-neutral-600"
            >
              {t('batalEdit')}
            </button>
          )}
        </div>

        <form
          key={mode === 'edit' ? pilihId ?? 'edit' : 'buat'}
          onSubmit={(e) => void (mode === 'buat' ? simpanBuat(e) : simpanEdit(e))}
          className="mt-5 grid gap-4 sm:grid-cols-2"
        >
          {mode === 'buat' && (
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('field.kode')}
              <input name="kode" placeholder={t('placeholder.kode')} className={inputCls} />
            </label>
          )}
          <label
            className={clsx(
              'text-sm font-medium text-neutral-700 dark:text-neutral-300',
              mode === 'buat' ? '' : 'sm:col-span-2',
            )}
          >
            {t('field.judul')}
            <input
              name="judul"
              required
              defaultValue={formDefaults?.judul ?? ''}
              placeholder={t('placeholder.judul')}
              className={inputCls}
            />
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.jenis')}
            <select name="jenis" defaultValue={formDefaults?.jenis ?? 'belajar'} className={inputCls}>
              <option value="belajar">{t('jenis.belajar')}</option>
              <option value="aksi">{t('jenis.aksi')}</option>
            </select>
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.kategori')}
            <select
              name="kategori"
              defaultValue={formDefaults?.kategori ?? 'lumba'}
              className={inputCls}
            >
              {KATEGORI.map((k) => (
                <option key={k} value={k}>
                  {t(`kategori.${k}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.poin')}
            <input
              name="poin"
              type="number"
              min={0}
              defaultValue={formDefaults?.poin ?? 20}
              className={inputCls}
            />
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.metode')}
            <select name="metode" defaultValue={metodeDefault} className={inputCls}>
              {METODE.map((m) => (
                <option key={m} value={m}>
                  {t(`metode.${m}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 sm:col-span-2">
            {t('field.stasiun')}
            <select
              name="stasiun_id"
              defaultValue={formDefaults?.stasiun?.id ?? ''}
              className={inputCls}
            >
              <option value="">{t('stasiunKosong')}</option>
              {stasiun.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} ({t(`tipeStasiun.${s.tipe}` as 'tipeStasiun.dermaga')})
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-neutral-500">{t('field.stasiunHint')}</span>
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 sm:col-span-2">
            {t('field.deskripsi')}
            <textarea
              name="deskripsi"
              rows={3}
              defaultValue={formDefaults?.deskripsi ?? ''}
              placeholder={t('placeholder.deskripsi')}
              className={inputCls}
            />
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 sm:col-span-2">
            {t('field.dampak')}
            <input
              name="dampak"
              defaultValue={dampakDefault}
              placeholder={t('placeholder.dampak')}
              className={inputCls}
            />
            <span className="mt-1 block text-xs font-normal text-neutral-500">{t('field.dampakHint')}</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 sm:col-span-2">
            <input
              name="bukti_foto"
              type="checkbox"
              defaultChecked={buktiFotoDefault}
              className="rounded border-neutral-300"
            />
            {t('field.buktiFoto')}
          </label>
          <button
            type="submit"
            disabled={menyimpan === 'form' || (mode === 'edit' && !detail)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50 sm:col-span-2 sm:w-fit dark:bg-primary-600"
          >
            <PlusIcon className="size-4" aria-hidden />
            {menyimpan === 'form'
              ? t('menyimpan')
              : mode === 'buat'
                ? t('tambahMisi')
                : t('simpanUbah')}
          </button>
        </form>
      </section>
    </div>
  )
}

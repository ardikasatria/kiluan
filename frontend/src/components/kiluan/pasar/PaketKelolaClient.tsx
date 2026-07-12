'use client'

import BadgeStatusPaket from '@/components/kiluan/pasar/BadgeStatusPaket'
import PaketItineraryEditor from '@/components/kiluan/pasar/PaketItineraryEditor'
import MediaGaleriKelola from '@/components/kiluan/MediaGaleriKelola'
import MediaUploader from '@/components/kiluan/MediaUploader'
import { Link } from '@/i18n/navigation'
import { kodeGalat, pesanGalat } from '@/lib/api/galat'
import {
  buatPaket,
  getDaftarPaket,
  getKurasiLog,
  getPaketDetail,
  transisiPaket,
  ubahPaket,
} from '@/lib/api/pasar'
import type { KurasiLogItem, MediaItem, PaketDetail, PaketRingkas } from '@/lib/api/types'
import { formatHarga } from '@/lib/kiluan/pasar'
import {
  OPSI_STATUS_PAKET,
  aksiPaketAgen,
  filterPaketStatus,
  paketBisaDiedit,
  type StatusPaketFilter,
} from '@/lib/kiluan/paket'
import {
  ArrowLeftIcon,
  ArchiveBoxIcon,
  PaperAirplaneIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

function slugify(nama: string) {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export default function PaketKelolaClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('pasar.paketKelola')
  const locale = useLocale()
  const localeTag = locale === 'en' ? 'en-ID' : 'id-ID'
  const [daftar, setDaftar] = useState<PaketRingkas[]>([])
  const [filterStatus, setFilterStatus] = useState<StatusPaketFilter>('semua')
  const [pilih, setPilih] = useState<PaketDetail | null>(null)
  const [logKurasi, setLogKurasi] = useState<KurasiLogItem[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [formPaket, setFormPaket] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)
  const [menyimpan, setMenyimpan] = useState(false)
  const [transisi, setTransisi] = useState(false)

  const [nama, setNama] = useState('')
  const [slug, setSlug] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [harga, setHarga] = useState(0)
  const [durasi, setDurasi] = useState(1)
  const [kuota, setKuota] = useState(2)
  const [satuan, setSatuan] = useState('per_paket')

  const muatDaftar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getDaftarPaket(desaSlug, { kelola: true })
      setDaftar(res.item)
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  const muatDetail = useCallback(
    async (id: string) => {
      const d = await getPaketDetail(desaSlug, id, true)
      setPilih(d)
      setMedia(d.media ?? [])
      setNama(d.nama)
      setSlug(d.slug)
      setDeskripsi(d.deskripsi ?? '')
      setHarga(d.harga)
      setDurasi(d.durasi_jam)
      setKuota(d.kuota_default)
      setSatuan(d.satuan_harga)
      try {
        const log = await getKurasiLog(desaSlug, { entitas_tipe: 'paket_wisata', entitas_id: d.id })
        setLogKurasi(log.item)
      } catch {
        setLogKurasi([])
      }
    },
    [desaSlug],
  )

  useEffect(() => {
    void muatDaftar()
  }, [muatDaftar])

  const terfilter = useMemo(() => filterPaketStatus(daftar, filterStatus), [daftar, filterStatus])

  const catatanKurator = useMemo(() => {
    const tolak = logKurasi.find((l) => l.keputusan === 'tolak' || l.keputusan === 'minta_revisi')
    return tolak?.catatan?.trim() || null
  }, [logKurasi])

  const bisaEdit = pilih ? paketBisaDiedit(pilih.status) : false
  const aksi = pilih ? aksiPaketAgen(pilih.status) : []

  async function bukaPaket(id: string) {
    setGalat(null)
    setSukses(null)
    setFormPaket(false)
    await muatDetail(id)
  }

  async function simpanPaketBaru(e: React.FormEvent) {
    e.preventDefault()
    setGalat(null)
    setMenyimpan(true)
    try {
      const detail = await buatPaket(desaSlug, {
        slug: slug || slugify(nama),
        nama,
        deskripsi,
        harga,
        durasi_jam: durasi,
        satuan_harga: satuan,
        kuota_default: kuota,
      })
      setFormPaket(false)
      await muatDaftar()
      await bukaPaket(detail.id)
      setSukses(t('created'))
    } catch (err) {
      if (kodeGalat(err) === 'konflik') setGalat(t('errors.slugConflict'))
      else setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMenyimpan(false)
    }
  }

  async function simpanMetadata() {
    if (!pilih || !bisaEdit) return
    setGalat(null)
    setMenyimpan(true)
    try {
      await ubahPaket(desaSlug, pilih.id, {
        nama,
        deskripsi,
        harga,
        durasi_jam: durasi,
        kuota_default: kuota,
      })
      await muatDetail(pilih.id)
      void muatDaftar()
      setSukses(t('saved'))
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMenyimpan(false)
    }
  }

  async function jalankanTransisi(aksi: 'ajukan' | 'arsip') {
    if (!pilih) return
    setGalat(null)
    setTransisi(true)
    try {
      const d = await transisiPaket(desaSlug, pilih.id, aksi)
      setPilih(d)
      setMedia(d.media ?? [])
      await muatDaftar()
      setSukses(t(`transisi.${aksi}`))
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setTransisi(false)
    }
  }

  if (loading && daftar.length === 0) {
    return <p className="container py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container py-8">
          <Link
            href={`/${desaSlug}/dasbor/agen`}
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            {t('backDashboard')}
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{desaNama}</p>

          <nav className="mt-4 flex flex-wrap gap-2" aria-label={t('subnavLabel')}>
            <span className="rounded-full bg-primary-700 px-3 py-1 text-sm font-medium text-white dark:bg-primary-600" aria-current="page">
              {t('tabPaket')}
            </span>
            <Link
              href={`/${desaSlug}/saya/agen/layanan`}
              className="rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-600 hover:border-primary-400 dark:border-neutral-600 dark:text-neutral-400"
            >
              {t('tabLayanan')}
            </Link>
          </nav>
        </div>
      </div>

      <div className="container grid gap-8 py-8 xl:grid-cols-[minmax(0,340px)_1fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">{t('myPackages')}</h2>
            <button
              type="button"
              onClick={() => {
                setFormPaket(true)
                setPilih(null)
                setNama('')
                setSlug('')
                setDeskripsi('')
                setHarga(0)
                setDurasi(6)
                setKuota(4)
              }}
              className="inline-flex items-center gap-1 rounded-full bg-primary-700 px-3 py-1.5 text-sm text-white hover:bg-primary-800"
            >
              <PlusIcon className="size-4" aria-hidden />
              {t('new')}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('filterStatus')}>
            {OPSI_STATUS_PAKET.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={filterStatus === s}
                onClick={() => setFilterStatus(s)}
                className={clsx(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition',
                  filterStatus === s
                    ? 'bg-primary-700 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400',
                )}
              >
                {t(`filter.${s}`)}
              </button>
            ))}
          </div>

          {formPaket && (
            <form onSubmit={(e) => void simpanPaketBaru(e)} className="space-y-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700">
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">{t('formNew')}</h3>
              <input
                value={nama}
                onChange={(e) => {
                  setNama(e.target.value)
                  if (!slug) setSlug(slugify(e.target.value))
                }}
                placeholder={t('packageName')}
                required
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              />
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={t('slugPlaceholder')}
                required
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  value={harga || ''}
                  onChange={(e) => setHarga(Number(e.target.value))}
                  placeholder={t('price')}
                  required
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                />
                <input
                  type="number"
                  min={1}
                  value={durasi || ''}
                  onChange={(e) => setDurasi(Number(e.target.value))}
                  placeholder={t('durationHours')}
                  required
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                />
              </div>
              <input
                type="number"
                min={1}
                value={kuota || ''}
                onChange={(e) => setKuota(Number(e.target.value))}
                placeholder={t('kuotaDefault')}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              />
              <button
                type="submit"
                disabled={menyimpan}
                className="w-full rounded-lg bg-primary-700 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {menyimpan ? t('saving') : t('create')}
              </button>
            </form>
          )}

          <ul className="space-y-2">
            {terfilter.length === 0 ? (
              <li className="text-sm text-neutral-500 dark:text-neutral-400">{t('emptyList')}</li>
            ) : (
              terfilter.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => void bukaPaket(p.id)}
                    className={clsx(
                      'w-full rounded-xl border px-4 py-3 text-left transition',
                      pilih?.id === p.id
                        ? 'border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/30'
                        : 'border-neutral-200 hover:border-primary-200 dark:border-neutral-700 dark:hover:border-primary-700',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-neutral-800 dark:text-neutral-100">{p.nama}</span>
                      <BadgeStatusPaket status={p.status} />
                    </div>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      {formatHarga(p.harga, p.satuan_harga, localeTag)}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          {!pilih ? (
            <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
              {t('selectPackage')}
            </p>
          ) : (
            <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-primary-800 dark:text-primary-100">{pilih.nama}</h2>
                    <BadgeStatusPaket status={pilih.status} />
                  </div>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">/{pilih.slug}</p>
                </div>
              </div>

              {galat && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
              )}
              {sukses && (
                <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">{sukses}</p>
              )}

              {pilih.status === 'review' && (
                <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">{t('waitingReview')}</p>
              )}

              {catatanKurator && (pilih.status === 'ditolak' || pilih.status === 'draft') && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">{t('curatorNote')}</p>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">{catatanKurator}</p>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">{t('metadata')}</h3>
                <textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  disabled={!bisaEdit}
                  rows={3}
                  placeholder={t('description')}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">{t('packageName')}</span>
                    <input
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      disabled={!bisaEdit}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">{t('price')}</span>
                    <input
                      type="number"
                      min={0}
                      value={harga}
                      onChange={(e) => setHarga(Number(e.target.value))}
                      disabled={!bisaEdit}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">{t('durationHours')}</span>
                    <input
                      type="number"
                      min={1}
                      value={durasi}
                      onChange={(e) => setDurasi(Number(e.target.value))}
                      disabled={!bisaEdit}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">{t('kuotaDefault')}</span>
                    <input
                      type="number"
                      min={1}
                      value={kuota}
                      onChange={(e) => setKuota(Number(e.target.value))}
                      disabled={!bisaEdit}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900"
                    />
                  </label>
                  <label className="text-sm sm:col-span-2">
                    <span className="mb-1 block font-medium">{t('satuanHarga')}</span>
                    <select
                      value={satuan}
                      disabled={!bisaEdit}
                      onChange={(e) => setSatuan(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900"
                    >
                      <option value="per_paket">{t('satuan.per_paket')}</option>
                      <option value="per_orang">{t('satuan.per_orang')}</option>
                    </select>
                  </label>
                </div>
                {bisaEdit && (
                  <button
                    type="button"
                    disabled={menyimpan}
                    onClick={() => void simpanMetadata()}
                    className="rounded-full bg-neutral-800 px-5 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-200 dark:text-neutral-900"
                  >
                    {menyimpan ? t('saving') : t('saveMetadata')}
                  </button>
                )}
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-neutral-800 dark:text-neutral-100">{t('gallery')}</h3>
                {bisaEdit && (
                  <MediaUploader
                    desaSlug={desaSlug}
                    entitasTipe="paket_wisata"
                    entitasId={pilih.id}
                    urutanAwal={media.length}
                    onBerhasil={(m) => setMedia((prev) => [...prev, m])}
                    className="mb-4"
                  />
                )}
                {media.length > 0 && (
                  <MediaGaleriKelola
                    desaSlug={desaSlug}
                    items={media}
                    onChange={setMedia}
                  />
                )}
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-neutral-800 dark:text-neutral-100">{t('itinerary')}</h3>
                <PaketItineraryEditor
                  desaSlug={desaSlug}
                  paketId={pilih.id}
                  item={pilih.item ?? []}
                  readOnly={!bisaEdit}
                  onChange={() => muatDetail(pilih.id)}
                />
              </div>

              <div className="flex flex-wrap gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                {aksi.includes('ajukan') && (
                  <button
                    type="button"
                    disabled={transisi}
                    onClick={() => void jalankanTransisi('ajukan')}
                    className="inline-flex items-center gap-2 rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
                  >
                    <PaperAirplaneIcon className="size-4" aria-hidden />
                    {t('submitCuration')}
                  </button>
                )}
                {aksi.includes('arsip') && (
                  <button
                    type="button"
                    disabled={transisi}
                    onClick={() => void jalankanTransisi('arsip')}
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-300"
                  >
                    <ArchiveBoxIcon className="size-4" aria-hidden />
                    {t('archive')}
                  </button>
                )}
                {pilih.status === 'publikasi' && (
                  <Link
                    href={`/${desaSlug}/paket/${pilih.slug}`}
                    className="inline-flex items-center rounded-full border border-primary-300 px-5 py-2.5 text-sm font-semibold text-primary-700 dark:border-primary-600 dark:text-primary-300"
                  >
                    {t('viewPublic')}
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

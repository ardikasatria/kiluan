'use client'

import TingkatSertifikasi from '@/components/kiluan/pasar/TingkatSertifikasi'
import { Link } from '@/i18n/navigation'
import { pesanGalat } from '@/lib/api/galat'
import {
  buatProduk,
  getProdukKelola,
  getUmkmKelola,
  hapusProduk,
  ubahProduk,
  ubahStatusProduk,
} from '@/lib/api/pasar'
import type { ProdukJasaItem, UmkmRingkas } from '@/lib/api/types'
import { formatHarga, labelVerifikasiUmkm } from '@/lib/kiluan/pasar'
import {
  ArrowLeftIcon,
  CheckBadgeIcon,
  ClockIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

type Jenis = 'produk' | 'jasa'

const SATUAN_OPSI = ['per_unit', 'per_orang', 'per_paket', 'per_malam', 'per_jam'] as const

interface FormProduk {
  id?: string
  nama: string
  jenis: Jenis
  deskripsi: string
  harga: string
  satuan_harga: string
  stok: string
}

const FORM_KOSONG: FormProduk = {
  nama: '',
  jenis: 'produk',
  deskripsi: '',
  harga: '',
  satuan_harga: 'per_unit',
  stok: '',
}

export default function UmkmKelolaClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('pasar.umkmKelola')
  const locale = useLocale()
  const localeTag = locale === 'en' ? 'en-ID' : 'id-ID'

  const [umkmList, setUmkmList] = useState<UmkmRingkas[]>([])
  const [produk, setProduk] = useState<ProdukJasaItem[]>([])
  const [umkmAktif, setUmkmAktif] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [formBuka, setFormBuka] = useState(false)
  const [form, setForm] = useState<FormProduk>(FORM_KOSONG)
  const [menyimpan, setMenyimpan] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const u = await getUmkmKelola(desaSlug)
      setUmkmList(u.item)
      const aktif = u.item[0]?.id ?? null
      setUmkmAktif((prev) => prev ?? aktif)
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  const muatProduk = useCallback(
    async (umkmId: string) => {
      const p = await getProdukKelola(desaSlug, umkmId)
      setProduk(p.item)
    },
    [desaSlug],
  )

  useEffect(() => {
    if (!umkmAktif) return
    void muatProduk(umkmAktif)
  }, [umkmAktif, muatProduk])

  const umkm = umkmList.find((u) => u.id === umkmAktif)
  const belumTerverifikasi = umkm != null && umkm.status_verifikasi !== 'terverifikasi'

  function bukaForm(p?: ProdukJasaItem) {
    setError(null)
    if (p) {
      setForm({
        id: p.id,
        nama: p.nama,
        jenis: p.jenis,
        deskripsi: p.deskripsi ?? '',
        harga: String(p.harga),
        satuan_harga: p.satuan_harga,
        stok: p.stok != null ? String(p.stok) : '',
      })
    } else {
      setForm(FORM_KOSONG)
    }
    setFormBuka(true)
  }

  async function simpanProduk() {
    if (!umkmAktif || !form.nama.trim() || !form.harga) {
      setError(t('errorWajib'))
      return
    }
    setError(null)
    setMenyimpan(true)
    try {
      if (form.id) {
        await ubahProduk(desaSlug, form.id, {
          nama: form.nama.trim(),
          deskripsi: form.deskripsi.trim(),
          harga: Number(form.harga),
          stok: form.jenis === 'jasa' ? null : form.stok ? Number(form.stok) : null,
        })
      } else {
        await buatProduk(desaSlug, {
          umkm_id: umkmAktif,
          nama: form.nama.trim(),
          jenis: form.jenis,
          deskripsi: form.deskripsi.trim(),
          harga: Number(form.harga),
          satuan_harga: form.satuan_harga,
          stok: form.jenis === 'jasa' ? null : form.stok ? Number(form.stok) : null,
        })
      }
      setFormBuka(false)
      setForm(FORM_KOSONG)
      await muatProduk(umkmAktif)
    } catch (err) {
      setError(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMenyimpan(false)
    }
  }

  async function ubahStatus(p: ProdukJasaItem, status: 'draft' | 'publikasi' | 'arsip') {
    if (status === 'publikasi' && belumTerverifikasi) return
    setError(null)
    setInfo(null)
    try {
      await ubahStatusProduk(desaSlug, p.id, status)
      if (umkmAktif) await muatProduk(umkmAktif)
    } catch (err) {
      // Publish-gate: backend menolak 422 bila UMKM belum terverifikasi.
      setError(pesanGalat(err, locale as 'id' | 'en'))
    }
  }

  async function hapus(p: ProdukJasaItem) {
    if (!confirm(t('hapusKonfirmasi', { nama: p.nama }))) return
    setError(null)
    try {
      await hapusProduk(desaSlug, p.id)
      if (umkmAktif) await muatProduk(umkmAktif)
    } catch (err) {
      setError(pesanGalat(err, locale as 'id' | 'en'))
    }
  }

  if (loading) {
    return <p className="container py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
  }

  const inputClass =
    'w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100'

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container py-8">
          <Link
            href={`/${desaSlug}/dasbor/umkm`}
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            <ArrowLeftIcon className="size-4" /> {t('backDashboard')}
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{desaNama}</p>

          <nav className="mt-4 flex flex-wrap gap-2" aria-label={t('subnavLabel')}>
            <span
              className="rounded-full bg-primary-700 px-3 py-1 text-sm font-medium text-white dark:bg-primary-600"
              aria-current="page"
            >
              {t('tabProduk')}
            </span>
            <Link
              href={`/${desaSlug}/saya/umkm/layanan`}
              className="rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-600 hover:border-primary-400 dark:border-neutral-600 dark:text-neutral-400"
            >
              {t('tabLayanan')}
            </Link>
          </nav>
        </div>
      </div>

      <div className="container py-8">
        {umkmList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-12 text-center dark:border-neutral-600">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('noUmkm')}</p>
            <Link
              href={`/${desaSlug}/saya/umkm/daftar`}
              className="mt-4 inline-flex rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500"
            >
              {t('registerUmkm')}
            </Link>
          </div>
        ) : (
          <>
            {umkmList.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {umkmList.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setUmkmAktif(u.id)}
                    className={clsx(
                      'rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition',
                      umkmAktif === u.id
                        ? 'bg-primary-700 text-white ring-primary-700 dark:bg-primary-600 dark:ring-primary-600'
                        : 'bg-white text-neutral-700 ring-neutral-300 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-700',
                    )}
                  >
                    {u.nama}
                  </button>
                ))}
              </div>
            )}

            {umkm && <VerifikasiBanner umkm={umkm} />}

            <div className="mt-6 flex items-center justify-between gap-4">
              <h2 className="font-semibold text-primary-800 dark:text-primary-100">{t('productList')}</h2>
              <button
                type="button"
                onClick={() => bukaForm()}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500"
              >
                <PlusIcon className="size-4" /> {t('add')}
              </button>
            </div>

            {formBuka && (
              <div className="mt-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('productName')}</span>
                    <input
                      value={form.nama}
                      onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                      className={clsx(inputClass, 'mt-1.5')}
                    />
                  </label>
                  <label>
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('jenis')}</span>
                    <select
                      value={form.jenis}
                      disabled={!!form.id}
                      onChange={(e) => setForm((f) => ({ ...f, jenis: e.target.value as Jenis }))}
                      className={clsx(inputClass, 'mt-1.5 disabled:opacity-60')}
                    >
                      <option value="produk">{t('jenisProduk')}</option>
                      <option value="jasa">{t('jenisJasa')}</option>
                    </select>
                  </label>
                  <label>
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('satuan')}</span>
                    <select
                      value={form.satuan_harga}
                      disabled={!!form.id}
                      onChange={(e) => setForm((f) => ({ ...f, satuan_harga: e.target.value }))}
                      className={clsx(inputClass, 'mt-1.5 disabled:opacity-60')}
                    >
                      {SATUAN_OPSI.map((s) => (
                        <option key={s} value={s}>
                          {t(`satuanOpsi.${s}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('priceIdr')}</span>
                    <input
                      type="number"
                      value={form.harga}
                      onChange={(e) => setForm((f) => ({ ...f, harga: e.target.value }))}
                      className={clsx(inputClass, 'mt-1.5')}
                    />
                  </label>
                  {form.jenis === 'produk' && (
                    <label>
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('stok')}</span>
                      <input
                        type="number"
                        value={form.stok}
                        onChange={(e) => setForm((f) => ({ ...f, stok: e.target.value }))}
                        className={clsx(inputClass, 'mt-1.5')}
                      />
                    </label>
                  )}
                  <label className="sm:col-span-2">
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('deskripsi')}</span>
                    <textarea
                      value={form.deskripsi}
                      onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
                      rows={3}
                      className={clsx(inputClass, 'mt-1.5 resize-y')}
                    />
                  </label>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void simpanProduk()}
                    disabled={menyimpan}
                    className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-primary-600"
                  >
                    {menyimpan ? t('menyimpan') : t('save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormBuka(false)
                      setForm(FORM_KOSONG)
                    }}
                    className="rounded-lg px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </p>
            )}
            {info && (
              <p className="mt-3 rounded-lg bg-primary-50 px-4 py-2.5 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
                {info}
              </p>
            )}

            <ul className="mt-6 divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
              {produk.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">{t('emptyKelola')}</li>
              )}
              {produk.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{p.nama}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {formatHarga(p.harga, p.satuan_harga, localeTag)}
                      <span className="ml-2 capitalize">· {p.jenis}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={p.status} />
                    {p.status !== 'publikasi' && (
                      <button
                        type="button"
                        disabled={belumTerverifikasi}
                        title={belumTerverifikasi ? t('unverifiedTitle') : t('publishTitle')}
                        onClick={() => void ubahStatus(p, 'publikasi')}
                        className={clsx(
                          'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                          belumTerverifikasi
                            ? 'cursor-not-allowed bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500'
                            : 'bg-primary-700 text-white hover:bg-primary-600 dark:bg-primary-600',
                        )}
                      >
                        {t('publish')}
                      </button>
                    )}
                    {p.status === 'publikasi' && (
                      <button
                        type="button"
                        onClick={() => void ubahStatus(p, 'arsip')}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-300"
                      >
                        {t('archive')}
                      </button>
                    )}
                    {p.status === 'arsip' && (
                      <button
                        type="button"
                        onClick={() => void ubahStatus(p, 'draft')}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-300"
                      >
                        {t('toDraft')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => bukaForm(p)}
                      title={t('edit')}
                      className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-primary-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      <PencilSquareIcon className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => void hapus(p)}
                      title={t('delete')}
                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <TrashIcon className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

function VerifikasiBanner({ umkm }: { umkm: UmkmRingkas }) {
  const t = useTranslations('pasar.umkmKelola')
  const status = umkm.status_verifikasi
  const terverifikasi = status === 'terverifikasi'
  const ditolak = status === 'ditolak'

  const Icon = terverifikasi ? CheckBadgeIcon : ditolak ? XCircleIcon : ClockIcon
  const tone = terverifikasi
    ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/25 dark:text-emerald-100'
    : ditolak
      ? 'border-red-200 bg-red-50/80 text-red-900 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-100'
      : 'border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/25 dark:text-amber-100'

  return (
    <div className={clsx('flex flex-wrap items-center gap-3 rounded-2xl border p-4', tone)}>
      <Icon className="size-6 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{umkm.nama}</p>
          <TingkatSertifikasi tingkat={umkm.sertifikasi?.tingkat} skor={umkm.sertifikasi?.skor} />
        </div>
        <p className="text-sm">
          {labelVerifikasiUmkm(status, (key) => t(key as 'verifikasi.menunggu'))}
          {!terverifikasi ? ` — ${t('unverifiedNotice')}` : ''}
        </p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('pasar.umkmKelola.statusProduk')
  const map: Record<string, string> = {
    draft: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
    publikasi: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    arsip: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  }
  const known = (['draft', 'publikasi', 'arsip'] as const).find((s) => s === status)
  return (
    <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', map[status] ?? map.draft)}>
      {known ? t(known) : status}
    </span>
  )
}

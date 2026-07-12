'use client'

import MapPicker from '@/components/kiluan/MapPicker'
import { Link, useRouter } from '@/i18n/navigation'
import { getBidangUsaha } from '@/lib/api/lencana'
import { buatUmkm } from '@/lib/api/pasar'
import { pesanGalat } from '@/lib/api/galat'
import type { BidangUsaha, Lokasi } from '@/lib/api/types'
import { PUSAT_LAMPUNG } from '@/lib/kiluan/jelajah-params'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
  lokasiDesa: Lokasi | null
}

export default function UmkmDaftarClient({ desaSlug, desaNama, lokasiDesa }: Props) {
  const t = useTranslations('pasar.umkmDaftar')
  const locale = useLocale()
  const router = useRouter()

  const [bidangList, setBidangList] = useState<BidangUsaha[]>([])
  const [bidangId, setBidangId] = useState<number | ''>('')
  const [nama, setNama] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [telepon, setTelepon] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [alamat, setAlamat] = useState('')
  const [pakaiLokasi, setPakaiLokasi] = useState(false)
  const [lokasi, setLokasi] = useState<Lokasi>(lokasiDesa ?? PUSAT_LAMPUNG)
  const [mengirim, setMengirim] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  useEffect(() => {
    void getBidangUsaha().then(setBidangList)
  }, [])

  async function simpan() {
    if (!bidangId || !nama.trim()) {
      setGalat(t('errorWajib'))
      return
    }
    setGalat(null)
    setMengirim(true)
    try {
      const body: Record<string, unknown> = {
        bidang_id: bidangId,
        nama: nama.trim(),
        deskripsi: deskripsi.trim(),
        telepon: telepon.trim(),
        whatsapp: whatsapp.trim(),
        alamat: alamat.trim(),
      }
      if (pakaiLokasi) body.lokasi = { lat: lokasi.lat, lng: lokasi.lng }
      await buatUmkm(desaSlug, body)
      router.push(`/${desaSlug}/saya/umkm/produk`)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
      setMengirim(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100'
  const labelClass = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300'

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container py-8">
          <Link
            href={`/${desaSlug}/saya/umkm/produk`}
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            {t('back')}
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('subtitle', { desa: desaNama })}</p>
        </div>
      </div>

      <div className="container max-w-2xl py-8">
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/25 dark:text-amber-100">
          {t('verifNotice')}
        </div>

        {galat && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
            {galat}
          </p>
        )}

        <div className="space-y-5">
          <div>
            <label htmlFor="umkm-bidang" className={labelClass}>
              {t('bidang')} <span className="text-red-500">*</span>
            </label>
            <select
              id="umkm-bidang"
              value={bidangId}
              onChange={(e) => setBidangId(e.target.value ? Number(e.target.value) : '')}
              className={clsx(inputClass, 'mt-1.5')}
            >
              <option value="">{t('bidangPilih')}</option>
              {bidangList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.ikon ? `${b.ikon} ` : ''}
                  {b.nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="umkm-nama" className={labelClass}>
              {t('nama')} <span className="text-red-500">*</span>
            </label>
            <input
              id="umkm-nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder={t('namaPlaceholder')}
              className={clsx(inputClass, 'mt-1.5')}
            />
          </div>

          <div>
            <label htmlFor="umkm-deskripsi" className={labelClass}>
              {t('deskripsi')}
            </label>
            <textarea
              id="umkm-deskripsi"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              rows={4}
              placeholder={t('deskripsiPlaceholder')}
              className={clsx(inputClass, 'mt-1.5 resize-y')}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="umkm-telepon" className={labelClass}>
                {t('telepon')}
              </label>
              <input
                id="umkm-telepon"
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className={clsx(inputClass, 'mt-1.5')}
              />
            </div>
            <div>
              <label htmlFor="umkm-wa" className={labelClass}>
                {t('whatsapp')}
              </label>
              <input
                id="umkm-wa"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="628xxxxxxxxxx"
                className={clsx(inputClass, 'mt-1.5')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="umkm-alamat" className={labelClass}>
              {t('alamat')}
            </label>
            <input
              id="umkm-alamat"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder={t('alamatPlaceholder')}
              className={clsx(inputClass, 'mt-1.5')}
            />
          </div>

          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={pakaiLokasi}
                onChange={(e) => setPakaiLokasi(e.target.checked)}
                className="size-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600"
              />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('lokasiToggle')}</span>
            </label>
            {pakaiLokasi && (
              <div className="mt-4">
                <MapPicker value={lokasi} onChange={setLokasi} />
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {t('lokasiHint', { lat: lokasi.lat.toFixed(5), lng: lokasi.lng.toFixed(5) })}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => void simpan()}
              disabled={mengirim}
              className="rounded-full bg-primary-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-500"
            >
              {mengirim ? t('mengirim') : t('daftar')}
            </button>
            <Link
              href={`/${desaSlug}/saya/umkm/produk`}
              className="rounded-full border border-neutral-300 px-6 py-2.5 text-sm font-medium text-neutral-700 dark:border-neutral-600 dark:text-neutral-300"
            >
              {t('batal')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

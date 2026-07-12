'use client'

import { Link } from '@/i18n/navigation'
import { getDestinasiDetail } from '@/lib/api/destinasi'
import type { KontribusiItem } from '@/lib/api/types'
import {
  labelTargetKontribusi,
  labelTipeKontribusi,
  perluTombolTerapkan,
  ringkasanMuatan,
  urlTerapkan,
} from '@/lib/kiluan/kontribusi'
import { PhotoIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  item: KontribusiItem
}

export default function KontribusiMuatanKurasi({ desaSlug, item }: Props) {
  const t = useTranslations('kelola.kurasi.kontribusiDetail')
  const tKontrib = useTranslations('kontribusi')
  const tr = tKontrib as unknown as (key: string) => string
  const m = item.muatan
  const [nilaiSaatIni, setNilaiSaatIni] = useState<string | null>(null)

  useEffect(() => {
    if (item.tipe !== 'koreksi_data' || item.target_tipe !== 'destinasi' || !item.target_id) return
    const field = String(m.field ?? '')
    void getDestinasiDetail(desaSlug, item.target_id).then((d) => {
      if (!d) return
      let raw: unknown
      if (field === 'jam_operasional') raw = d.jam_operasional
      else if (field === 'deskripsi') raw = d.deskripsi
      else if (field === 'alamat') raw = d.alamat
      else if (field === 'nama') raw = d.nama
      else return
      if (raw != null) setNilaiSaatIni(typeof raw === 'object' ? JSON.stringify(raw) : String(raw))
    })
  }, [desaSlug, item, m.field])

  if (item.tipe === 'foto') {
    return (
      <div className="space-y-3">
        <div className="flex aspect-video items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
          {item.media_id ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('fotoMedia', { id: item.media_id.slice(0, 8) })}</p>
          ) : (
            <PhotoIcon className="size-12 text-neutral-400" aria-hidden />
          )}
        </div>
        {m.keterangan != null && String(m.keterangan).trim() !== '' && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{String(m.keterangan)}</p>
        )}
      </div>
    )
  }

  if (item.tipe === 'tips' || item.tipe === 'ulasan') {
    return (
      <blockquote className="rounded-xl border border-neutral-200 bg-white p-4 text-sm italic text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-300">
        {String(m.isi ?? m.teks ?? '—')}
      </blockquote>
    )
  }

  if (item.tipe === 'koreksi_data') {
    return (
      <dl className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
        <div>
          <dt className="text-xs font-medium uppercase text-neutral-500">{t('field')}</dt>
          <dd className="mt-1 font-mono text-sm text-neutral-800 dark:text-neutral-100">{String(m.field ?? '—')}</dd>
        </div>
        {nilaiSaatIni != null && (
          <div>
            <dt className="text-xs font-medium uppercase text-neutral-500">{t('nilaiSaatIni')}</dt>
            <dd className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{nilaiSaatIni}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-medium uppercase text-primary-600 dark:text-primary-400">{t('usulan')}</dt>
          <dd className="mt-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">{String(m.usulan ?? '—')}</dd>
        </div>
        {m.alasan != null && String(m.alasan).trim() !== '' && (
          <div>
            <dt className="text-xs font-medium uppercase text-neutral-500">{t('alasan')}</dt>
            <dd className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{String(m.alasan)}</dd>
          </div>
        )}
      </dl>
    )
  }

  if (item.tipe === 'spot_baru') {
    return (
      <dl className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
        <div>
          <dt className="text-xs font-medium uppercase text-neutral-500">{t('namaSpot')}</dt>
          <dd className="mt-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{String(m.nama ?? '—')}</dd>
        </div>
        {m.deskripsi != null && String(m.deskripsi).trim() !== '' && (
          <div>
            <dt className="text-xs font-medium uppercase text-neutral-500">{t('deskripsi')}</dt>
            <dd className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{String(m.deskripsi)}</dd>
          </div>
        )}
      </dl>
    )
  }

  return (
    <p className="text-sm text-neutral-600 dark:text-neutral-400">{ringkasanMuatan(item, tr)}</p>
  )
}

export function BannerBelumDiterapkan({ desaSlug, item }: Props) {
  const t = useTranslations('kelola.kurasi.kontribusiDetail')
  if (!perluTombolTerapkan(item)) return null
  const url = urlTerapkan(desaSlug, item)
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{t('bannerBelumDiterapkan')}</p>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{t('bannerDesc')}</p>
      {url && (
        <Link
          href={url}
          className="mt-3 inline-flex rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
        >
          {t('bukaEditor')}
        </Link>
      )}
    </div>
  )
}

export function MetaKontribusi({ item }: { item: KontribusiItem }) {
  const t = useTranslations('kelola.kurasi.kontribusiDetail')
  const tKontrib = useTranslations('kontribusi')
  const tr = tKontrib as unknown as (key: string) => string

  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs text-neutral-500">{t('tipe')}</dt>
        <dd className="font-medium text-neutral-800 dark:text-neutral-100">{labelTipeKontribusi(item.tipe, tr)}</dd>
      </div>
      <div>
        <dt className="text-xs text-neutral-500">{t('target')}</dt>
        <dd className="font-medium text-neutral-800 dark:text-neutral-100">
          {labelTargetKontribusi(item.target_tipe, tr)}
          {item.target_id && <span className="ms-1 font-normal text-neutral-500">#{item.target_id.slice(0, 8)}</span>}
        </dd>
      </div>
    </dl>
  )
}

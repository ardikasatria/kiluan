'use client'

import { cariDestinasiKelolaFiltered } from '@/lib/api/destinasi'
import { getKategori } from '@/lib/api/referensi'
import type { DestinasiRingkas, Kategori } from '@/lib/api/types'
import { Link } from '@/i18n/navigation'
import Select from '@/shared/Select'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  awal: DestinasiRingkas[]
}

export default function DestinasiKelolaListClient({ desaSlug, awal }: Props) {
  const t = useTranslations('kelola.destinasi')
  const [daftar, setDaftar] = useState(awal)
  const [kategori, setKategori] = useState<Kategori[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterKategori, setFilterKategori] = useState('')

  useEffect(() => {
    void getKategori().then(setKategori)
  }, [])

  useEffect(() => {
    void cariDestinasiKelolaFiltered(desaSlug, {
      status: filterStatus || undefined,
      kategori: filterKategori ? Number(filterKategori) : undefined,
    }).then((r) => setDaftar(r.item))
  }, [desaSlug, filterStatus, filterKategori])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100">{t('listTitle')}</h2>
        <Link
          href={`/${desaSlug}/kelola/destinasi/baru`}
          className="inline-flex justify-center rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          {t('new')}
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm">
          <option value="">{t('filterSemuaStatus')}</option>
          <option value="draft">{t('status.draft')}</option>
          <option value="publikasi">{t('status.publikasi')}</option>
          <option value="arsip">{t('status.arsip')}</option>
        </Select>
        <Select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)} className="text-sm">
          <option value="">{t('filterSemuaKategori')}</option>
          {kategori.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-700">
          <thead className="bg-neutral-50 dark:bg-neutral-800/80">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">{t('table.nama')}</th>
              <th className="hidden px-4 py-3 text-left font-medium text-neutral-600 sm:table-cell dark:text-neutral-300">
                {t('table.slug')}
              </th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">{t('table.status')}</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">{t('table.aksi')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-700 dark:bg-neutral-900/40">
            {daftar.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              daftar.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{d.nama}</td>
                  <td className="hidden px-4 py-3 text-neutral-500 sm:table-cell dark:text-neutral-400">{d.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        d.status === 'publikasi'
                          ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                      }`}
                    >
                      {t(`status.${d.status}` as 'status.draft')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${desaSlug}/kelola/destinasi/${d.id}`}
                      className="text-primary-700 hover:underline dark:text-primary-300"
                    >
                      {t('edit')}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

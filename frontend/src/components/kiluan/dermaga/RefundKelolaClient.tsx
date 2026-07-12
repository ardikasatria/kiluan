'use client'

import PanelKeputusan from '@/components/kiluan/kurasi/PanelKeputusan'
import { pesanGalat } from '@/lib/api/galat'
import { getRefund, transisiRefund } from '@/lib/api/uang'
import type { RefundDto } from '@/lib/api/types'
import { Link } from '@/i18n/navigation'
import { kunciIdempotensi, hapusKunciIdempotensi } from '@/lib/kiluan/cart'
import { formatHarga } from '@/lib/kiluan/pasar'
import { formatTanggal } from '@/lib/kiluan/lencana'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

const STATUS_FILTER = ['', 'diajukan', 'disetujui', 'diproses', 'selesai', 'ditolak'] as const

export default function RefundKelolaClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.refund')
  const tr = t as unknown as (key: string) => string
  const [refund, setRefund] = useState<RefundDto[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [aksiId, setAksiId] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const r = await getRefund(desaSlug, { status: filterStatus || undefined })
      setRefund(r.item)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, filterStatus, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  async function transisi(
    id: string,
    aksi: 'setuju' | 'tolak' | 'proses' | 'selesai',
    catatan = '',
  ) {
    setGalat(null)
    setSukses(null)
    setAksiId(id)
    const idem = kunciIdempotensi(`refund-${id}-${aksi}`)
    try {
      await transisiRefund(desaSlug, id, aksi, idem)
      hapusKunciIdempotensi(`refund-${id}-${aksi}`)
      setSukses(t(`sukses.${aksi}`))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
      throw err
    } finally {
      setAksiId(null)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('desc')}</p>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t('bendaharaLink')}{' '}
        <Link href={`/${desaSlug}/kelola/bendahara`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          {t('bendaharaCta')}
        </Link>
      </p>

      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
        aria-label={t('filterStatus')}
      >
        <option value="">{t('filterSemua')}</option>
        {STATUS_FILTER.filter(Boolean).map((s) => (
          <option key={s} value={s}>
            {tr(`status.${s}`)}
          </option>
        ))}
      </select>

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}
      {sukses && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
          {sukses}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
      ) : refund.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700">
          {refund.map((r) => (
            <li key={r.id} className="p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {formatHarga(r.jumlah, 'per_paket')}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {t('pesanan', { id: r.pesanan_id.slice(0, 8) })}
                  </p>
                  <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{r.alasan}</p>
                  {r.dibuat_pada && (
                    <time className="mt-1 block text-xs text-neutral-500" dateTime={r.dibuat_pada}>
                      {formatTanggal(r.dibuat_pada, locale === 'en' ? 'en-US' : 'id-ID')}
                    </time>
                  )}
                </div>
                <span className="h-fit rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium dark:bg-neutral-800 dark:text-neutral-200">
                  {tr(`status.${r.status}`)}
                </span>
              </div>

              {r.status === 'diajukan' && (
                <PanelKeputusan
                  aktif
                  sembunyikanRevisi
                  labelSetuju={tr('aksi.setuju')}
                  className="mt-4"
                  onKeputusan={async (aksi, catatan) => {
                    const mapped = aksi === 'setuju' ? 'setuju' : 'tolak'
                    await transisi(r.id, mapped, catatan)
                  }}
                />
              )}

              {r.status === 'disetujui' && (
                <button
                  type="button"
                  disabled={aksiId === r.id}
                  onClick={() => void transisi(r.id, 'proses')}
                  className="mt-3 rounded-full border border-primary-300 px-4 py-1.5 text-xs font-medium dark:border-primary-600"
                >
                  {aksiId === r.id ? t('memproses') : tr('aksi.proses')}
                </button>
              )}

              {r.status === 'diproses' && (
                <button
                  type="button"
                  disabled={aksiId === r.id}
                  onClick={() => void transisi(r.id, 'selesai')}
                  className="mt-3 rounded-full bg-primary-700 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {aksiId === r.id ? t('memproses') : tr('aksi.selesai')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

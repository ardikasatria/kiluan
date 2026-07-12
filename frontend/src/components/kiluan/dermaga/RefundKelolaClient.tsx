'use client'

import { pesanGalat } from '@/lib/api/galat'
import { getRefund, transisiRefund } from '@/lib/api/uang'
import type { RefundDto } from '@/lib/api/types'
import { Link } from '@/i18n/navigation'
import { formatHarga } from '@/lib/kiluan/pasar'
import { formatTanggal } from '@/lib/kiluan/lencana'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

const AKSI: Record<string, Array<'setuju' | 'tolak' | 'proses' | 'selesai'>> = {
  diajukan: ['setuju', 'tolak'],
  disetujui: ['proses'],
  diproses: ['selesai'],
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

  async function transisi(id: string, aksi: 'setuju' | 'tolak' | 'proses' | 'selesai') {
    const konfirmasiKey = aksi === 'tolak' ? 'konfirmasiTolak' : aksi === 'setuju' ? 'konfirmasiSetuju' : null
    if (konfirmasiKey && !confirm(t(konfirmasiKey))) return
    setGalat(null)
    setSukses(null)
    setAksiId(id)
    try {
      await transisiRefund(desaSlug, id, aksi)
      setSukses(t(`sukses.${aksi}`))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
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
        <p className="text-sm text-neutral-500">{t('loading')}</p>
      ) : refund.length === 0 ? (
        <p className="text-sm text-neutral-500">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700">
          {refund.map((r) => (
            <li key={r.id} className="p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium">{formatHarga(r.jumlah, 'per_paket')}</p>
                  <p className="text-xs text-neutral-500">{t('pesanan', { id: r.pesanan_id.slice(0, 8) })}</p>
                  <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{r.alasan}</p>
                  {r.dibuat_pada && (
                    <time className="mt-1 block text-xs text-neutral-500" dateTime={r.dibuat_pada}>
                      {formatTanggal(r.dibuat_pada, locale === 'en' ? 'en-US' : 'id-ID')}
                    </time>
                  )}
                </div>
                <span className="h-fit rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium dark:bg-neutral-800">
                  {tr(`status.${r.status}`)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(AKSI[r.status] ?? []).map((a) => (
                  <button
                    key={a}
                    type="button"
                    disabled={aksiId === r.id}
                    onClick={() => void transisi(r.id, a)}
                    className="rounded-full border border-primary-300 px-3 py-1 text-xs font-medium hover:bg-primary-50 disabled:opacity-50 dark:border-primary-600 dark:hover:bg-primary-900/30"
                  >
                    {aksiId === r.id ? t('memproses') : tr(`aksi.${a}`)}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

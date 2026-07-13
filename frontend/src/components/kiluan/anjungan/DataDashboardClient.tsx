'use client'

import { Link } from '@/i18n/navigation'
import { pesanGalat } from '@/lib/api/galat'
import { getAgregatRingkas, jalankanGold } from '@/lib/api/analitik'
import type { AgregatRingkasDto } from '@/lib/api/types'
import { useAuth } from '@/contexts/AuthProvider'
import { adalahPengelolaKonten } from '@/lib/kiluan/kelola-akses'
import ReactECharts from 'echarts-for-react'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

function periodeSaatIni() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatRupiah(n: number, locale: string) {
  return new Intl.NumberFormat(locale === 'en' ? 'en-ID' : 'id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)
}

export default function DataDashboardClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('anjungan.dashboard')
  const locale = useLocale() as 'id' | 'en'
  const { user } = useAuth()
  const steward = adalahPengelolaKonten(user?.profil ?? null)
  const [periode, setPeriode] = useState(periodeSaatIni)
  const [data, setData] = useState<AgregatRingkasDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)
  const [jobMsg, setJobMsg] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const res = await getAgregatRingkas(desaSlug, periode)
      setData(res)
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, periode, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  async function hitungGold() {
    setJobMsg(null)
    setGalat(null)
    try {
      await jalankanGold(desaSlug)
      setJobMsg(t('jobOk'))
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    }
  }

  const chartPendapatan = useMemo(() => {
    const s = data?.metrik?.pendapatan?.series ?? []
    if (!s.length) return null
    return {
      tooltip: { trigger: 'axis' as const },
      xAxis: { type: 'category' as const, data: s.map((r) => r.tanggal.slice(5)) },
      yAxis: { type: 'value' as const },
      series: [{ type: 'line' as const, smooth: true, data: s.map((r) => r.nilai), areaStyle: {} }],
    }
  }, [data])

  const chartKunjungan = useMemo(() => {
    const s = data?.metrik?.kunjungan?.series ?? []
    if (!s.length) return null
    return {
      tooltip: { trigger: 'axis' as const },
      xAxis: { type: 'category' as const, data: s.map((r) => r.tanggal.slice(5)) },
      yAxis: { type: 'value' as const },
      series: [{ type: 'bar' as const, data: s.map((r) => r.nilai) }],
    }
  }, [data])

  const kartu = [
    { key: 'umkm_aktif', label: t('kartu.umkm'), nilai: data?.metrik?.umkm_aktif?.total },
    { key: 'adopsi_regeneratif', label: t('kartu.adopsi'), nilai: data?.metrik?.adopsi_regeneratif?.total },
    { key: 'kontribusi', label: t('kartu.kontribusi'), nilai: data?.metrik?.kontribusi?.total, uang: true },
  ].filter((k) => k.nilai != null && k.nilai > 0)

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-slate-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="container py-10">
          <p className="text-sm text-primary-600 dark:text-primary-400">{desaNama}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h1>
            <Link href={`/${desaSlug}/data/laporan`} className="text-sm font-medium text-primary-600 hover:underline">
              {t('linkLaporan')}
            </Link>
          </div>
          <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
          {data?.diperbarui_pada && (
            <p className="mt-2 text-xs text-neutral-500">{t('kesegaran', { waktu: data.diperbarui_pada })}</p>
          )}
        </div>
      </div>

      <div className="container max-w-5xl space-y-8 py-8">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="font-medium">{t('periode')}</span>
            <input
              type="month"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="mt-1 block rounded-lg border px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
            />
          </label>
          {steward && (
            <button
              type="button"
              onClick={() => void hitungGold()}
              className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white"
            >
              {t('jalankanGold')}
            </button>
          )}
        </div>

        {galat && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{galat}</p>}
        {jobMsg && <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800">{jobMsg}</p>}
        {loading ? (
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        ) : !data || Object.keys(data.metrik || {}).length === 0 ? (
          <p className="text-sm text-neutral-500">{t('empty')}</p>
        ) : (
          <>
            {kartu.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-3">
                {kartu.map((k) => (
                  <div key={k.key} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
                    <p className="text-sm text-neutral-500">{k.label}</p>
                    <p className="mt-1 text-2xl font-bold">
                      {'uang' in k && k.uang ? formatRupiah(k.nilai!, locale) : k.nilai}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {chartPendapatan && (
              <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
                <h2 className="mb-3 font-semibold">{t('chart.pendapatan')}</h2>
                <ReactECharts option={chartPendapatan} style={{ height: 280 }} />
              </section>
            )}
            {chartKunjungan && (
              <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
                <h2 className="mb-3 font-semibold">{t('chart.kunjungan')}</h2>
                <ReactECharts option={chartKunjungan} style={{ height: 280 }} />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
